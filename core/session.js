// ============================================================
// ZEDCLEANER — core/session.js
// Login state + page guard.
// All non-admin users share role "user".
// ============================================================

import { saveData, loadData, removeData } from "./storage.js";
import { findUserById, ROLES } from "./engine.js";

const KEY_SESSION = "zedcleaner_session";

export function setSession(user) {
  if (!user || !user.id) return false;
  return saveData(KEY_SESSION, { userId: user.id });
}

export function getCurrentUser() {
  const session = loadData(KEY_SESSION, null);
  if (!session || !session.userId) return null;
  return findUserById(session.userId);
}

export function clearSession() {
  return removeData(KEY_SESSION);
}

/**
 * Guard a protected page.
 * By default, any logged-in user passes.
 * Pass ROLES.ADMIN only for admin-only pages.
 */
export function requireAuth(requiredRole = null) {
  const user = getCurrentUser();
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

/**
 * Relative path to a user's dashboard from within a subfolder.
 * Now everyone goes to /dashboard.html (top-level).
 */
function dashboardPathFor(role) {
  if (role === ROLES.ADMIN) return "../admin/dashboard.html";
  return "../dashboard.html";
}