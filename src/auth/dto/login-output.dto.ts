import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AccessAndRefreshTokenDto {
  @IsNotEmpty()
  @Expose()
  @ApiProperty()
  accessToken: string;

  @IsNotEmpty()
  @Expose()
  @ApiProperty()
  refreshToken: string;
}

export class UserInfo {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty()
  role: string;

  @Expose()
  @ApiProperty()
  firstName: string;

  @Expose()
  @ApiProperty()
  lastName: string;

  @Expose()
  @ApiProperty()
  phone: string;
}

export class LoginOutputDto {
  @Expose()
  @ApiProperty()
  @Type(() => AccessAndRefreshTokenDto)
  accessAndRefreshToken: AccessAndRefreshTokenDto;

  @Expose()
  @ApiProperty()
  @Type(() => UserInfo)
  userInfo: UserInfo;
}
