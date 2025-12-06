import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './entities/token.entity';
import { JwtModule } from '@nestjs/jwt';
import { TOKEN_CONFIG } from '../config/token/token.config';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error(
            'JWT_SECRET is not defined in environment variables. Please set JWT_SECRET in your .env file.',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: `${TOKEN_CONFIG.EXP.accessTokenExp}d` },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
