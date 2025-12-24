import { IsString, MinLength } from "class-validator";

export class CreateQueueDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
