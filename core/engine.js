// ============================================================
// ZEDCLEANER — core/storage.js
// The ONLY file that talks to localStorage.
// ============================================================

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`[storage] Failed to save "${key}":`, error);
    return false;
  }
}

export function loadData(key, fallback = null) {
  try {
    const jsonString = localStorage.getItem(key);
    if (jsonString === null) return fallback;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`[storage] Failed to load "${key}":`, error);
    return fallback;
  }
}

export function removeData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to remove "${key}":`, error);
    return false;
  }
}
