import { IsOptional, IsString } from "class-validator";

export class CreateTicketDto {
  @IsString()
  queueId!: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}
