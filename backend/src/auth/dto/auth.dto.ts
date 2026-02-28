import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsNotEmpty()
  @IsString({ message: 'Username harus berupa string' })
  @ApiProperty({ example: 'jhondoe' })
  username!: string;

  @IsNotEmpty()
  @MinLength(6)
  @IsString({ message: 'Password harus berupa string' })
  @ApiProperty({ example: '123456' })
  password!: string;
}