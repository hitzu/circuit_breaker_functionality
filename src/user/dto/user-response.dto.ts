import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
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
