import { IsOptional, IsString } from "class-validator";

export class AssignScreenDto {
  @IsOptional()
  @IsString()
  queueId?: string;
}
