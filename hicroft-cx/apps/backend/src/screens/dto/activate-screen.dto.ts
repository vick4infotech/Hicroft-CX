import { IsString, MinLength } from "class-validator";

export class ActivateScreenDto {
  @IsString()
  @MinLength(4)
  activationCode!: string;
}
