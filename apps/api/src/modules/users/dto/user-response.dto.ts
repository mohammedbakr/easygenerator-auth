import { ApiProperty } from '@nestjs/swagger';
import type { UserEntity } from '../entities/user.entity.js';

/** The only user shape that leaves the API; fields are copied one by one on purpose. */
export class UserResponseDto {
  @ApiProperty({ example: '665f1c2e8b1e4a0012a3b4c5' })
  id: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  static from(user: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    return dto;
  }
}
