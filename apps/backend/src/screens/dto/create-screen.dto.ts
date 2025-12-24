import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateScreenDto {
  @IsString()
  @MinLength(2)
  name!: string;

  // Optional convenience: allow screen creation + assignment in one request.
  @IsOptional()
  @IsString()
  queueId?: string;
}
