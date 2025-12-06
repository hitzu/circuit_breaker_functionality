import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { USER_ROLES } from '../../common/types/user-roles.type';

export class SignupDto {
  @ApiProperty({ type: String, required: true })
  @IsNotEmpty()
  @IsEnum(USER_ROLES)
  role!: USER_ROLES;

  @ApiProperty({ type: String, required: true, default: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ type: String, required: true, default: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ type: String, required: true, default: 'correo@gmail.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, required: true, default: '1234' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ type: String, required: true, default: '1234567890' })
  @IsNotEmpty()
  @IsString()
  phone!: string;
}
