// ============================================================
// ZEDCLEANER — core/session.js
// Login state + page guard.
// Session ID stays in localStorage (device-level concept).
// ============================================================

import { findUserById, ROLES } from "./engine.js";

const KEY_SESSION = "zedcleaner_session";

// ---------- Local session persistence ----------
// We do NOT use Firestore for the session — it's per-device by nature,
// so localStorage is the right tool here.
function saveSessionData(data) {
  try { localStorage.setItem(KEY_SESSION, JSON.stringify(data)); return true; }
  catch { return false; }
}
function loadSessionData() {
  try {
    const s = localStorage.getItem(KEY_SESSION);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function removeSessionData() {
  try { localStorage.removeItem(KEY_SESSION); return true; }
  catch { return false; }
}

// ---------- Session API ----------

export function setSession(user) {
  if (!user || !user.id) return false;
  return saveSessionData({ userId: user.id });
}

/**
 * Return the full user object of whoever is logged in.
 * Async — fetches from Firestore.
 */
export async function getCurrentUser() {
  const session = loadSessionData();
  if (!session || !session.userId) return null;
  return await findUserById(session.userId);
}

export function clearSession() {
  return removeSessionData();
}

/**
 * Guard a protected page.
 * Any logged-in user passes. Pass ROLES.ADMIN for admin-only pages.
 */
export async function requireAuth(requiredRole = null) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "../auth.html";
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = dashboardPathFor(user.role);
    return null;
  }
  return user;
}

function dashboardPathFor(role) {
  if (role === ROLES.ADMIN) return "../admin/dashboard.html";
  return "../dashboard.html";
}
