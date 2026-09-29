export const storage = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  set(key: string, value: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  remove(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};
