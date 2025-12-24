import { Role } from "../../common/enums/role.enum";
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  orgId?: string;
}
