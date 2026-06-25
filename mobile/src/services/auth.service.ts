import { apiRequest } from './api-client';

export interface LoginForm {
  tenantCode: string;
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    fullName: string;
    roleCode: string | null;
    tenantId: string;
  };
}

export function loginMobile(form: LoginForm): Promise<LoginResult> {
  return apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

export const DEMO_CREDENTIALS: LoginForm = {
  tenantCode: '01',
  username: 'admin',
  password: 'admin123',
};
