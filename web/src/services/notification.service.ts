import { apiRequest } from './api-client';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  refType: string | null;
  refId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread: number;
}

export function listNotifications() {
  return apiRequest<NotificationListResponse>('/notification');
}

export function markNotificationRead(id: string) {
  return apiRequest<unknown>(`/notification/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return apiRequest<{ ok: boolean }>('/notification/read-all', { method: 'POST' });
}
