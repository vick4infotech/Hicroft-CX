import { IsOptional, IsString } from "class-validator";

export class TransferDto {
  @IsOptional()
  @IsString()
  counterNumber?: string;
}
