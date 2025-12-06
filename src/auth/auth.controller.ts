import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SignupDto } from '../user/dto/signup.dto';
import { LoginOutputDto } from './dto/login-output.dto';
import { LoginDto } from './dto/login.dto';
import { EXCEPTION_RESPONSE } from '../config/errors/exception-response.config';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: 'User created successfully',
  })
  async signup(@Body() signupDto: SignupDto) {
    try {
      return this.authService.signup(signupDto);
    } catch (error) {
      console.log(error, 'Error signing up');
      throw error;
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'User logged in successfully',
  })
  @ApiBadRequestResponse({
    description: EXCEPTION_RESPONSE.LOGIN_BAD_CREDENTIAL.message,
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginOutputDto> {
    return this.authService.login(loginDto);
  }
}
