import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserType = {
  id: string;
  users_uuid: string;
  username: string;
  email: string;
  status: string | null;
  role_id: string | null;
  role: {
    id: string;
    role_uuid: string;
    name: string;
    status: string | null;
  } | null;
  created_at: Date;
  updated_at: Date;
};

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserType;
    return data ? user?.[data] : user;
  },
);