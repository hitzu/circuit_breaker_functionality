import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TokenService } from '../token/token.service';
import { User } from '../user/entities/user.entity';
import { Token } from '../token/entities/token.entity';
import { SignupDto } from '../user/dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AppDataSource as TestDataSource } from '../config/database/data-source';
import { UserFactory } from '../../test/factories/user/user.factory';
import { USER_ROLES } from '../common/types/user-roles.type';
import { EXCEPTION_RESPONSE } from '../config/errors/exception-response.config';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let tokenService: TokenService;
  let userRepository: Repository<User>;
  let userFactory: UserFactory;
  let mockJwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    } as unknown as jest.Mocked<JwtService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        TokenService,
        {
          provide: getRepositoryToken(User),
          useValue: TestDataSource.getRepository(User),
        },
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

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    tokenService = module.get<TokenService>(TokenService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userFactory = new UserFactory(TestDataSource);
  });

  describe('signup', () => {
    describe('Happy Path - Successful Signup', () => {
      it('should create a new user and return tokens with user info', async () => {
        // Arrange
        const userData = await userFactory.make();
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: 'SecurePassword123!',
          phone: userData.phone,
        };
        jest
          .spyOn(mockJwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        const result = await service.signup(signupDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.accessAndRefreshToken).toBeDefined();
        expect(result.accessAndRefreshToken.accessToken).toBe('access-token');
        expect(result.accessAndRefreshToken.refreshToken).toBe('refresh-token');
        expect(result.userInfo).toBeDefined();
        expect(result.userInfo.email).toBe(signupDto.email);
        expect(result.userInfo.firstName).toBe(signupDto.firstName);
        expect(result.userInfo.lastName).toBe(signupDto.lastName);
        expect(result.userInfo.role).toBe(signupDto.role);
        expect(result.userInfo.phone).toBe(signupDto.phone);
      });

      it('should create user with hashed password', async () => {
        // Arrange
        const userData = await userFactory.make();
        const plainPassword = 'MyPassword123!';
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: plainPassword,
          phone: userData.phone,
        };
        jest
          .spyOn(mockJwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        await service.signup(signupDto);

        // Assert
        const createdUser = await userRepository.findOne({
          where: { email: signupDto.email },
        });
        expect(createdUser).toBeDefined();
        expect(createdUser?.password).not.toBe(plainPassword);
        expect(await createdUser?.comparePassword(plainPassword)).toBe(true);
      });

      it('should generate auth tokens after user creation', async () => {
        // Arrange
        const userData = await userFactory.make();
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: 'Password123!',
          phone: userData.phone,
        };
        const generateAuthTokensSpy = jest
          .spyOn(tokenService, 'generateAuthTokens')
          .mockResolvedValue({
            accessToken: 'generated-access-token',
            refreshToken: 'generated-refresh-token',
          });

        // Act
        const result = await service.signup(signupDto);

        // Assert
        expect(generateAuthTokensSpy).toHaveBeenCalledTimes(1);
        expect(result.accessAndRefreshToken.accessToken).toBe(
          'generated-access-token',
        );
        expect(result.accessAndRefreshToken.refreshToken).toBe(
          'generated-refresh-token',
        );
      });
    });

    describe('Negative Testing - Email Already Exists', () => {
      it('should throw ConflictException when email is already in use', async () => {
        // Arrange
        await userFactory.create({
          email: 'existing@example.com',
        });
        const userData = await userFactory.make();
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: 'existing@example.com', // Same email
          password: 'Password123!',
          phone: userData.phone,
        };

        // Act & Assert
        await expect(service.signup(signupDto)).rejects.toThrow(
          ConflictException,
        );
        await expect(service.signup(signupDto)).rejects.toThrow(
          EXCEPTION_RESPONSE.SIGNUP_EMAIL_IN_USE.message,
        );
      });

      it('should not create user when email conflict occurs', async () => {
        // Arrange
        await userFactory.create({
          email: 'conflict@example.com',
        });
        const initialUserCount = await userRepository.count();
        const userData = await userFactory.make();
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: 'conflict@example.com',
          password: 'Password123!',
          phone: userData.phone,
        };

        await expect(service.signup(signupDto)).rejects.toThrow(
          ConflictException,
        );

        // Assert
        const finalUserCount = await userRepository.count();
        expect(finalUserCount).toBe(initialUserCount);
      });
    });

    describe('Parameterized Testing - All User Roles', () => {
      const userRoles = Object.values(USER_ROLES);

      it.each(userRoles)(
        'should successfully signup user with role: %s',
        async (role) => {
          // Arrange
          const userData = await userFactory.make();
          const signupDto: SignupDto = {
            role,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: 'Password123!',
            phone: userData.phone,
          };
          jest
            .spyOn(mockJwtService, 'signAsync')
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');

          // Act
          const result = await service.signup(signupDto);

          // Assert
          expect(result).toBeDefined();
          expect(result.userInfo.role).toBe(role);
        },
      );
    });

    describe('Boundary Value Analysis - Email Variations', () => {
      it('should handle email with special characters', async () => {
        // Arrange
        const userData = await userFactory.make();
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: 'test+tag@example.co.uk',
          password: 'Password123!',
          phone: userData.phone,
        };
        jest
          .spyOn(mockJwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        const result = await service.signup(signupDto);

        // Assert
        expect(result.userInfo.email).toBe('test+tag@example.co.uk');
      });
    });

    describe('Error Handling', () => {
      it('should propagate errors from UserService', async () => {
        // Arrange
        const userData = await userFactory.make();
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: 'Password123!',
          phone: userData.phone,
        };
        jest
          .spyOn(userService, 'createNewUser')
          .mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(service.signup(signupDto)).rejects.toThrow(
          'Database error',
        );
      });

      it('should propagate errors from TokenService', async () => {
        // Arrange
        const userData = await userFactory.make();
        const signupDto: SignupDto = {
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: 'Password123!',
          phone: userData.phone,
        };
        jest
          .spyOn(tokenService, 'generateAuthTokens')
          .mockRejectedValue(new Error('Token generation failed'));

        // Act & Assert
        await expect(service.signup(signupDto)).rejects.toThrow(
          'Token generation failed',
        );
      });
    });
  });

  describe('login', () => {
    describe('Happy Path - Successful Login', () => {
      it('should return tokens and user info for valid credentials', async () => {
        // Arrange
        const plainPassword = 'CorrectPassword123!';
        const user = await userFactory.createWithPassword(plainPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: plainPassword,
        };
        jest
          .spyOn(mockJwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.accessAndRefreshToken).toBeDefined();
        expect(result.accessAndRefreshToken.accessToken).toBe('access-token');
        expect(result.accessAndRefreshToken.refreshToken).toBe('refresh-token');
        expect(result.userInfo).toBeDefined();
        expect(result.userInfo.email).toBe(user.email);
        expect(result.userInfo.id).toBe(user.id);
      });

      it('should generate auth tokens after successful authentication', async () => {
        // Arrange
        const plainPassword = 'Password123!';
        const user = await userFactory.createWithPassword(plainPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: plainPassword,
        };
        const generateAuthTokensSpy = jest
          .spyOn(tokenService, 'generateAuthTokens')
          .mockResolvedValue({
            accessToken: 'generated-access-token',
            refreshToken: 'generated-refresh-token',
          });

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(generateAuthTokensSpy).toHaveBeenCalledTimes(1);
        expect(generateAuthTokensSpy).toHaveBeenCalledWith(user);
        expect(result.accessAndRefreshToken.accessToken).toBe(
          'generated-access-token',
        );
      });
    });

    describe('Negative Testing - User Not Found', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        // Arrange
        const loginDto: LoginDto = {
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        };

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.login(loginDto)).rejects.toThrow(
          EXCEPTION_RESPONSE.USER_NOT_FOUND.message,
        );
      });
    });

    describe('Negative Testing - Invalid Password', () => {
      it('should throw UnauthorizedException for wrong password', async () => {
        // Arrange
        const correctPassword = 'CorrectPassword123!';
        const user = await userFactory.createWithPassword(correctPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: 'WrongPassword123!',
        };

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.login(loginDto)).rejects.toThrow(
          EXCEPTION_RESPONSE.LOGIN_BAD_CREDENTIAL.message,
        );
      });

      it('should throw UnauthorizedException for empty password', async () => {
        // Arrange
        const correctPassword = 'CorrectPassword123!';
        const user = await userFactory.createWithPassword(correctPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: '',
        };

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException for password with only spaces', async () => {
        // Arrange
        const correctPassword = 'CorrectPassword123!';
        const user = await userFactory.createWithPassword(correctPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: '   ',
        };

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('Equivalence Partitioning - Password Variations', () => {
      it('should accept correct password with special characters', async () => {
        // Arrange
        const specialPassword = 'P@ssw0rd!#$%';
        const user = await userFactory.createWithPassword(specialPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: specialPassword,
        };
        jest
          .spyOn(mockJwtService, 'signAsync')
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.userInfo.email).toBe(user.email);
      });

      it('should reject similar but incorrect password', async () => {
        // Arrange
        const correctPassword = 'CorrectPassword123!';
        const user = await userFactory.createWithPassword(correctPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: 'CorrectPassword123', // Missing !
        };

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('Boundary Value Analysis - Email Variations', () => {
      it('should handle case-sensitive email lookup', async () => {
        // Arrange
        const plainPassword = 'Password123!';
        const user = await userFactory.createWithPassword(plainPassword);
        const loginDto: LoginDto = {
          email: user.email.toUpperCase(), // Different case
          password: plainPassword,
        };

        // Act & Assert
        // This depends on database collation - PostgreSQL is case-sensitive by default
        // If user.email is 'test@example.com', 'TEST@EXAMPLE.COM' won't match
        await expect(service.login(loginDto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('State-Based Testing - Multiple Login Attempts', () => {
      it('should generate new tokens on each login', async () => {
        // Arrange
        const plainPassword = 'Password123!';
        const user = await userFactory.createWithPassword(plainPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: plainPassword,
        };
        jest
          .spyOn(mockJwtService, 'signAsync')
          .mockResolvedValueOnce('first-access-token')
          .mockResolvedValueOnce('first-refresh-token')
          .mockResolvedValueOnce('second-access-token')
          .mockResolvedValueOnce('second-refresh-token');

        // Act
        const result1 = await service.login(loginDto);
        const result2 = await service.login(loginDto);

        // Assert
        expect(result1.accessAndRefreshToken.accessToken).toBe(
          'first-access-token',
        );
        expect(result2.accessAndRefreshToken.accessToken).toBe(
          'second-access-token',
        );
        expect(result1.accessAndRefreshToken.accessToken).not.toBe(
          result2.accessAndRefreshToken.accessToken,
        );
      });
    });

    describe('Error Handling', () => {
      it('should propagate errors from UserService', async () => {
        // Arrange
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'Password123!',
        };
        jest
          .spyOn(userService, 'findUserByEmail')
          .mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow('Database error');
      });

      it('should propagate errors from TokenService', async () => {
        // Arrange
        const plainPassword = 'Password123!';
        const user = await userFactory.createWithPassword(plainPassword);
        const loginDto: LoginDto = {
          email: user.email,
          password: plainPassword,
        };
        jest
          .spyOn(tokenService, 'generateAuthTokens')
          .mockRejectedValue(new Error('Token generation failed'));

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(
          'Token generation failed',
        );
      });
    });
  });
});
