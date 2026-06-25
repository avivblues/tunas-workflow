import { apiRequest } from './api-client';

export interface LoginInput {
  tenantCode: string;
  username: string;
  password: string;
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
  tenant?: { id: string; code: string; name: string };
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface TenantLoginOption {
  tenantCode: string;
  tenantName: string;
  fullName: string;
  roleCode: string | null;
  roleName: string | null;
}

export function lookupTenantsForUsername(username: string) {
  return apiRequest<{ username: string; tenants: TenantLoginOption[] }>('/auth/lookup-tenants', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function login(input: LoginInput) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMe() {
  return apiRequest<AuthUser>('/auth/me');
}
