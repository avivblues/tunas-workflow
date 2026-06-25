import { apiRequest } from './api-client';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  roleId: string | null;
  active: boolean;
  role?: { id: string; code: string; name: string } | null;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  permissions: unknown;
}

export interface DomainNode {
  id: string;
  parentId: string | null;
  domainCode: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Tenant {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export function listUsers() {
  return apiRequest<User[]>('/user');
}

export function createUser(data: {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  roleId?: string;
}) {
  return apiRequest<User>('/user', { method: 'POST', body: JSON.stringify(data) });
}

export function listRoles() {
  return apiRequest<Role[]>('/role');
}

export function createRole(data: { name: string; code: string }) {
  return apiRequest<Role>('/role', { method: 'POST', body: JSON.stringify(data) });
}

export function listDomains(type?: string) {
  const qs = type ? `?type=${type}` : '';
  return apiRequest<DomainNode[]>(`/domain${qs}`);
}

export function createDomain(data: {
  domainCode: string;
  name: string;
  type: 'LOCATION' | 'ZONE' | 'DEPARTMENT';
  parentId?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  return apiRequest<DomainNode>('/domain', { method: 'POST', body: JSON.stringify(data) });
}

export function getTenant() {
  return apiRequest<Tenant>('/tenant');
}
