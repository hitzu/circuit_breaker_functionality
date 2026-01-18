import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsNumber()
  userId?: number;
}
