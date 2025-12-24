import { IsOptional, IsString } from "class-validator";

export class CallNextDto {
  @IsString()
  queueId!: string;

  @IsOptional()
  @IsString()
  counterNumber?: string;
}
