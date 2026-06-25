import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransactionHeader } from './transaction.service';

const CACHE_PREFIX = 'tunas_tx_list_';
const QUEUE_KEY = 'tunas_offline_queue';

export interface OfflineQueueItem {
  id: string;
  type: 'action' | 'log';
  transactionId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function getCachedTransactionList(appCode: string): Promise<TransactionHeader[] | null> {
  const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${appCode}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TransactionHeader[];
  } catch {
    return null;
  }
}

export async function setCachedTransactionList(
  appCode: string,
  items: TransactionHeader[],
): Promise<void> {
  await AsyncStorage.setItem(`${CACHE_PREFIX}${appCode}`, JSON.stringify(items));
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineQueueItem[];
  } catch {
    return [];
  }
}

export async function enqueueOfflineItem(item: Omit<OfflineQueueItem, 'id' | 'createdAt'>): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    return /network|fetch|failed/i.test(err.message);
  }
  return false;
}
