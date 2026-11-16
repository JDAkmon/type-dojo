import {STORAGE_KEY, freshState, validateState} from './progress.js';

export const RECOVERY_KEY = 'type-dojo-recovery-v1';

// Never replace an unreadable save until its exact bytes have a durable copy.
export function loadProgress(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return freshState();
  try { return validateState(JSON.parse(raw)); }
  catch {
    const backups = JSON.parse(storage.getItem(RECOVERY_KEY) || '[]');
    if (!Array.isArray(backups) || backups.some(b => typeof b.raw !== 'string')) {
      throw new Error('The recovery archive could not be read.');
    }
    if (!backups.some(b => b.raw === raw)) {
      backups.push({at: Date.now(), raw});
      const archive = JSON.stringify(backups);
      storage.setItem(RECOVERY_KEY, archive);
      if (storage.getItem(RECOVERY_KEY) !== archive) throw new Error('Recovery copy was not saved.');
    }
    return freshState();
  }
}

export function saveProgress(storage, state) {
  // This also protects against a corrupt save arriving from another tab.
  loadProgress(storage);
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function recoveryFiles(storage) {
  try {
    const backups = JSON.parse(storage.getItem(RECOVERY_KEY) || '[]');
    return Array.isArray(backups) ? backups.filter(b => typeof b.raw === 'string') : [];
  } catch { return []; }
}
