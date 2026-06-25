export interface JwtPayload {
  sub: string;
  tenantId: string;
  username: string;
  roleCode: string | null;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  email: string | null;
  roleId: string | null;
  roleCode: string | null;
  roleName: string | null;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
    tenantId?: string;
  }
}
