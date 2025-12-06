import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { SignupDto } from '../user/dto/signup.dto';
import { EXCEPTION_RESPONSE } from 'src/config/errors/exception-response.config';
import { Logger } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { LoginOutputDto, UserInfo } from './dto/login-output.dto';
import { TokenService } from '../token/token.service';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  public async signup(signupDto: SignupDto): Promise<LoginOutputDto> {
    try {
      const { email } = signupDto;
      const existingUser = await this.userService.findUserByEmail(email);
      if (existingUser)
        throw new ConflictException(EXCEPTION_RESPONSE.SIGNUP_EMAIL_IN_USE);
      const user = await this.userService.createNewUser(signupDto);
      const tokens = await this.tokenService.generateAuthTokens(user);

      return {
        accessAndRefreshToken: tokens,
        userInfo: plainToInstance(UserInfo, user, {
          excludeExtraneousValues: true,
        }),
      };
    } catch (error) {
      this.logger.error(error, 'Error signing up');
      throw error;
    }
  }

  public async login(loginDto: LoginDto): Promise<LoginOutputDto> {
    try {
      const { email, password } = loginDto;
      const user = await this.userService.findUserByEmail(email);
      if (!user) {
        throw new NotFoundException(EXCEPTION_RESPONSE.USER_NOT_FOUND);
      }
      if (!(await user.comparePassword(password))) {
        throw new UnauthorizedException(
          EXCEPTION_RESPONSE.LOGIN_BAD_CREDENTIAL,
        );
      }

      const tokens = await this.tokenService.generateAuthTokens(user);

      return {
        accessAndRefreshToken: tokens,
        userInfo: plainToInstance(UserInfo, user, {
          excludeExtraneousValues: true,
        }),
      };
    } catch (error) {
      this.logger.error(error, 'Error logging in');
      throw error;
    }
  }
}
