import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { TokenService } from './token.service';
import { Token } from './entities/token.entity';
import { AppDataSource as TestDataSource } from '../config/database/data-source';
import { UserFactory } from '../../test/factories/user/user.factory';
import { TokenFactory } from '../../test/factories/token/token.factory';
import { TOKEN_TYPE } from '../common/types/token-type';

describe('TokenService', () => {
  let service: TokenService;
  let tokenRepository: Repository<Token>;
  let userFactory: UserFactory;
  let tokenFactory: TokenFactory;
  let jwtService: JwtService;

  beforeEach(async () => {
    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: getRepositoryToken(Token),
          useValue: TestDataSource.getRepository(Token),
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    tokenRepository = module.get<Repository<Token>>(getRepositoryToken(Token));
    jwtService = module.get<JwtService>(JwtService);
    userFactory = new UserFactory(TestDataSource);
    tokenFactory = new TokenFactory(TestDataSource);
  });

  describe('generateAuthTokens', () => {
    describe('Happy Path - Token Generation', () => {
      it('should generate access and refresh tokens for a user', async () => {
        // Arrange
        const user = await userFactory.create();
        const signAsyncSpy = jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token-123')
          .mockResolvedValueOnce('refresh-token-456');

        // Act
        const result = await service.generateAuthTokens(user);

        // Assert
        expect(result).toBeDefined();
        expect(result.accessToken).toBe('access-token-123');
        expect(result.refreshToken).toBe('refresh-token-456');
        expect(signAsyncSpy).toHaveBeenCalledTimes(2);
      });

      it('should generate tokens with correct payload structure', async () => {
        // Arrange
        const user = await userFactory.create();
        const signAsyncSpy = jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        await service.generateAuthTokens(user);

        // Assert
        // Verify first call (access token)
        expect(signAsyncSpy).toHaveBeenNthCalledWith(
          1,
          {
            sub: user.id,
            email: user.email,
            type: TOKEN_TYPE.ACCESS,
            id: user.id,
          },
          { expiresIn: '60d' },
        );
        // Verify second call (refresh token)
        expect(signAsyncSpy).toHaveBeenNthCalledWith(
          2,
          {
            sub: user.id,
            email: user.email,
            type: TOKEN_TYPE.REFRESH,
            id: user.id,
          },
          { expiresIn: '365d' },
        );
      });

      it('should persist access token to database', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token-persisted')
          .mockResolvedValueOnce('refresh-token-persisted');

        // Act
        await service.generateAuthTokens(user);

        // Assert
        const accessToken = await tokenRepository.findOne({
          where: { user: { id: user.id }, type: TOKEN_TYPE.ACCESS },
          relations: ['user'],
        });
        expect(accessToken).toBeDefined();
        expect(accessToken?.token).toBe('access-token-persisted');
        expect(accessToken?.type).toBe(TOKEN_TYPE.ACCESS);
        expect(accessToken?.user?.id).toBe(user.id);
      });

      it('should persist refresh token to database', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token-persisted')
          .mockResolvedValueOnce('refresh-token-persisted');

        // Act
        await service.generateAuthTokens(user);

        // Assert
        const refreshToken = await tokenRepository.findOne({
          where: { user: { id: user.id }, type: TOKEN_TYPE.REFRESH },
          relations: ['user'],
        });
        expect(refreshToken).toBeDefined();
        expect(refreshToken?.token).toBe('refresh-token-persisted');
        expect(refreshToken?.type).toBe(TOKEN_TYPE.REFRESH);
        expect(refreshToken?.user?.id).toBe(user.id);
      });

      it('should return tokens in correct format', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        const result = await service.generateAuthTokens(user);

        // Assert
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(typeof result.accessToken).toBe('string');
        expect(typeof result.refreshToken).toBe('string');
        expect(result.accessToken.length).toBeGreaterThan(0);
        expect(result.refreshToken.length).toBeGreaterThan(0);
      });
    });

    describe('State-Based Testing - Token Replacement', () => {
      it('should delete existing tokens before creating new ones', async () => {
        // Arrange
        const user = await userFactory.create();
        const existingAccessToken = await tokenFactory.createForUser(
          user,
          TOKEN_TYPE.ACCESS,
        );
        const existingRefreshToken = await tokenFactory.createForUser(
          user,
          TOKEN_TYPE.REFRESH,
        );

        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('new-access-token')
          .mockResolvedValueOnce('new-refresh-token');

        // Act
        await service.generateAuthTokens(user);

        // Assert
        const oldAccessToken = await tokenRepository.findOne({
          where: { id: existingAccessToken.id },
        });
        const oldRefreshToken = await tokenRepository.findOne({
          where: { id: existingRefreshToken.id },
        });
        expect(oldAccessToken).toBeNull();
        expect(oldRefreshToken).toBeNull();

        const newAccessToken = await tokenRepository.findOne({
          where: { user: { id: user.id }, type: TOKEN_TYPE.ACCESS },
        });
        const newRefreshToken = await tokenRepository.findOne({
          where: { user: { id: user.id }, type: TOKEN_TYPE.REFRESH },
        });
        expect(newAccessToken?.token).toBe('new-access-token');
        expect(newRefreshToken?.token).toBe('new-refresh-token');
      });

      it('should handle user with multiple existing tokens', async () => {
        // Arrange
        const user = await userFactory.create();
        // Create multiple tokens for the user
        await tokenFactory.createForUser(user, TOKEN_TYPE.ACCESS);
        await tokenFactory.createForUser(user, TOKEN_TYPE.ACCESS);
        await tokenFactory.createForUser(user, TOKEN_TYPE.REFRESH);
        await tokenFactory.createForUser(user, TOKEN_TYPE.REFRESH);

        const tokenCountBefore = await tokenRepository.count({
          where: { user: { id: user.id } },
        });
        expect(tokenCountBefore).toBe(4);

        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('new-access-token')
          .mockResolvedValueOnce('new-refresh-token');

        // Act
        await service.generateAuthTokens(user);

        // Assert
        const tokenCountAfter = await tokenRepository.count({
          where: { user: { id: user.id } },
        });
        expect(tokenCountAfter).toBe(2); // Only new access and refresh tokens
      });

      it('should only delete tokens for the specific user', async () => {
        // Arrange
        const user1 = await userFactory.create();
        const user2 = await userFactory.create();
        const user1Token = await tokenFactory.createForUser(
          user1,
          TOKEN_TYPE.ACCESS,
        );
        const user2Token = await tokenFactory.createForUser(
          user2,
          TOKEN_TYPE.ACCESS,
        );

        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('new-access-token')
          .mockResolvedValueOnce('new-refresh-token');

        // Act
        await service.generateAuthTokens(user1);

        // Assert
        const user1TokenAfter = await tokenRepository.findOne({
          where: { id: user1Token.id },
        });
        const user2TokenAfter = await tokenRepository.findOne({
          where: { id: user2Token.id },
        });
        expect(user1TokenAfter).toBeNull(); // Deleted
        expect(user2TokenAfter).toBeDefined(); // Still exists
      });
    });

    describe('Interaction-Based Testing - JWT Service Calls', () => {
      it('should call signAsync exactly twice', async () => {
        // Arrange
        const user = await userFactory.create();
        const signAsyncSpy = jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        await service.generateAuthTokens(user);

        // Assert
        expect(signAsyncSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe('Parameterized Testing - Different Users', () => {
      it('should generate unique tokens for different users', async () => {
        // Arrange
        const user1 = await userFactory.create();
        const user2 = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('user1-access')
          .mockResolvedValueOnce('user1-refresh')
          .mockResolvedValueOnce('user2-access')
          .mockResolvedValueOnce('user2-refresh');

        // Act
        const tokens1 = await service.generateAuthTokens(user1);
        const tokens2 = await service.generateAuthTokens(user2);

        // Assert
        expect(tokens1.accessToken).toBe('user1-access');
        expect(tokens2.accessToken).toBe('user2-access');
        expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      });
    });

    describe('Edge Case - User Without Existing Tokens', () => {
      it('should generate tokens for user with no existing tokens', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        const result = await service.generateAuthTokens(user);

        // Assert
        expect(result).toBeDefined();
        expect(result.accessToken).toBe('access-token');
        expect(result.refreshToken).toBe('refresh-token');
      });
    });

    describe('Error Handling', () => {
      it('should propagate JWT service errors', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockRejectedValueOnce(new Error('JWT signing failed'));

        // Act & Assert
        await expect(service.generateAuthTokens(user)).rejects.toThrow(
          'JWT signing failed',
        );
      });

      it('should propagate database errors during token deletion', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        const mockTransactionalManager = {
          delete: jest.fn().mockRejectedValue(new Error('Database error')),
        };

        const invalidRepository = {
          create: jest.fn().mockReturnValue({}),
          manager: {
            transaction: jest
              .fn()
              .mockImplementation(
                (
                  callback: (
                    manager: typeof mockTransactionalManager,
                  ) => Promise<unknown>,
                ) => {
                  return callback(mockTransactionalManager);
                },
              ),
          },
        } as unknown as Repository<Token>;

        const invalidService = new TokenService(invalidRepository, jwtService);

        // Act & Assert
        await expect(invalidService.generateAuthTokens(user)).rejects.toThrow(
          'Database error',
        );
      });

      it('should propagate database errors during token save', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        const mockTransactionalManager = {
          delete: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockRejectedValue(new Error('Save failed')),
        };

        const invalidRepository = {
          create: jest.fn().mockReturnValue({}),
          manager: {
            transaction: jest
              .fn()
              .mockImplementation(
                (
                  callback: (
                    manager: typeof mockTransactionalManager,
                  ) => Promise<unknown>,
                ) => {
                  return callback(mockTransactionalManager);
                },
              ),
          },
        } as unknown as Repository<Token>;

        const invalidService = new TokenService(invalidRepository, jwtService);

        // Act & Assert
        await expect(invalidService.generateAuthTokens(user)).rejects.toThrow(
          'Save failed',
        );
      });
    });

    describe('State-Based Testing - Token Persistence', () => {
      it('should persist tokens with correct timestamps', async () => {
        // Arrange
        const user = await userFactory.create();
        jest
          .spyOn(jwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        await service.generateAuthTokens(user);

        // Assert
        const accessToken = await tokenRepository.findOne({
          where: { user: { id: user.id }, type: TOKEN_TYPE.ACCESS },
        });
        const refreshToken = await tokenRepository.findOne({
          where: { user: { id: user.id }, type: TOKEN_TYPE.REFRESH },
        });

        expect(accessToken?.createdAt).toBeDefined();
        expect(accessToken?.updatedAt).toBeDefined();
        expect(refreshToken?.createdAt).toBeDefined();
        expect(refreshToken?.updatedAt).toBeDefined();
      });
    });
  });
});
