import { IsString } from "class-validator";

export class AssignAdminDto {
  @IsString()
  userId!: string;
}
