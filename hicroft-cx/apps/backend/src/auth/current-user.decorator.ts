import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * CurrentUser decorator returns req.user (populated by JwtStrategy).
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
