// ============================================================
// ZEDCLEANER — core/storage.js
// ------------------------------------------------------------
// PURPOSE:
//   The ONLY file in the entire project that talks to localStorage.
//   Everything else (engine.js, session.js) goes through these
//   three functions. This means if we ever replace localStorage
//   with a real server API, we only edit THIS file.
//
// CONNECTS TO:
//   - Imported by: core/engine.js, core/session.js
//   - Imports:     nothing (this is the foundation)
//
// STORAGE KEYS USED ELSEWHERE (defined in engine.js / session.js):
//   zedcleaner_users
//   zedcleaner_jobs
//   zedcleaner_proposals
//   zedcleaner_session
// ============================================================


/**
 * Save any JS value (object, array, string, number) to localStorage.
 * Automatically converts it to a JSON string.
 *
 * @param {string} key   - The storage key, e.g. "zedcleaner_jobs"
 * @param {*}      data  - Anything you want to store
 */
export function saveData(key, data) {
  try {
    const jsonString = JSON.stringify(data);
    localStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to save "${key}":`, error);
    return false;
  }
}


/**
 * Load a value from localStorage.
 * If the key does not exist (or is corrupted), returns `fallback`.
 *
 * @param {string} key       - The storage key
 * @param {*}      fallback  - What to return if nothing is stored
 *                             (usually [] for lists, {} for objects)
 * @returns {*}              - The stored value, or the fallback
 */
export function loadData(key, fallback = null) {
  try {
    const jsonString = localStorage.getItem(key);
    if (jsonString === null) {
      return fallback;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`[storage] Failed to load "${key}" (returning fallback):`, error);
    return fallback;
  }
}


/**
 * Permanently remove a key from localStorage.
 *
 * @param {string} key - The storage key to delete
 */
export function removeData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to remove "${key}":`, error);
    return false;
  }
}