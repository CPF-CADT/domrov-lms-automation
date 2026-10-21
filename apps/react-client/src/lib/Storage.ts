const isStorageAvailable = (): boolean => typeof window !== 'undefined' && 'localStorage' in window;

export const STORAGE_KEYS = {
  token: 'token',
  refreshToken: 'refreshToken',
  user: 'user',
} as const;

export const draftAssignmentKey = (classId: string): string => `draft_assignment_${classId}`;
export const gradeCacheKey = (classId: string | number): string => `gradeCache_${classId}`;
export const manualGradeCacheKey = (classId: string | number): string => `manualGradeCache_${classId}`;

export const storage = {
  get(key: string): string | null {
    if (!isStorageAvailable()) return null;
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    if (!isStorageAvailable()) return;
    try { window.localStorage.setItem(key, value); } catch { /* Ignore unavailable/full storage. */ }
  },
  remove(key: string): void {
    if (!isStorageAvailable()) return;
    try { window.localStorage.removeItem(key); } catch { /* Ignore storage failures during cleanup. */ }
  },
  getJson<T>(key: string): T | null {
    const value = this.get(key);
    if (!value) return null;
    try { return JSON.parse(value) as T; } catch { return null; }
  },
  setJson<T>(key: string, value: T): void {
    this.set(key, JSON.stringify(value));
  },
};
