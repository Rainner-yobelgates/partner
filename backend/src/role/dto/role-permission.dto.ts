import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsNumberString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Daftar permission ID aktif untuk role',
    example: ['1', '2', '3'],
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsNumberString({}, { each: true })
  permission_ids!: string[];
}

export class ToggleRolePermissionDto {
  @ApiProperty({
    description: 'Aktif/nonaktif permission untuk role',
    example: true,
  })
  @IsBoolean()
  active!: boolean;
}
