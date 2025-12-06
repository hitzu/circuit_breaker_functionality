import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Token } from './entities/token.entity';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { TOKEN_TYPE } from '../common/types/token-type';
import { TOKEN_CONFIG } from '../config/token/token.config';
import { AccessAndRefreshTokenDto } from './dto/access-refresh-token.dto';
import { DecodedTokenDto } from './dto/decode-token.dto';
import { Logger } from '@nestjs/common';
import { EXCEPTION_RESPONSE } from 'src/config/errors/exception-response.config';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly jwtService: JwtService,
  ) {
    if (!process.env.JWT_SECRET) {
      throw new InternalServerErrorException(
        EXCEPTION_RESPONSE.JWT_SECRET_NOT_FOUND,
      );
    }
  }

  private async generateJwtToken(
    user: User,
    expiresIn: number,
    type: TOKEN_TYPE,
  ): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      type,
      id: user.id,
    };

    try {
      return this.jwtService.signAsync(payload, { expiresIn: `${expiresIn}d` });
    } catch (error) {
      this.logger.error(error, 'Error generating JWT token');
      throw new InternalServerErrorException(
        EXCEPTION_RESPONSE.GENERATE_TOKEN_ERROR,
      );
    }
  }

  public async generateAuthTokens(
    user: User,
  ): Promise<AccessAndRefreshTokenDto> {
    // Generate both tokens before any database operations
    const [accessToken, refreshToken] = await Promise.all([
      this.generateJwtToken(
        user,
        TOKEN_CONFIG.EXP.accessTokenExp,
        TOKEN_TYPE.ACCESS,
      ),
      this.generateJwtToken(
        user,
        TOKEN_CONFIG.EXP.refreshTokenExp,
        TOKEN_TYPE.REFRESH,
      ),
    ]);

    // Build token entities
    const accessTokenEntity = this.tokenRepository.create({
      token: accessToken,
      user,
      type: TOKEN_TYPE.ACCESS,
    });
    const refreshTokenEntity = this.tokenRepository.create({
      token: refreshToken,
      user,
      type: TOKEN_TYPE.REFRESH,
    });

    await this.tokenRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Delete existing tokens for the user
        await transactionalEntityManager.delete(Token, {
          user: { id: user.id },
        });

        // Save both new token entities
        await transactionalEntityManager.save(Token, [
          accessTokenEntity,
          refreshTokenEntity,
        ]);
      },
    );

    // Return tokens only after transaction commits
    return { accessToken, refreshToken };
  }

  public async verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET,
    });
  }

  public decodeToken(token: string): DecodedTokenDto {
    return this.jwtService.decode(token);
  }
}
