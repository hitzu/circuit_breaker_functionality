import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [UserModule, TokenModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
})
export class AuthModule {}
