// ============================================================
// ZEDCLEANER — core/session.js
// ------------------------------------------------------------
// PURPOSE:
//   Knows who is currently logged in.
//   Guards protected pages by role.
//   Stores ONLY the user ID in localStorage — not the whole user —
//   so user data always comes from engine.js (one source of truth).
//
// CONNECTS TO:
//   Imports:  core/storage.js, core/engine.js
//   Imported by:
//     assets/js/auth.js
//     assets/js/ui.js
//     customer/dashboard.html
//     provider/dashboard.html
//     admin/dashboard.html
// ============================================================

import { saveData, loadData, removeData } from "./storage.js";
import { findUserById, ROLES } from "./engine.js";

const KEY_SESSION = "zedcleaner_session";

// ---------- Login state ----------

/**
 * Save the logged-in user's ID.
 */
export function setSession(user) {
  if (!user || !user.id) return false;
  return saveData(KEY_SESSION, { userId: user.id });
}

/**
 * Return the full user object of whoever is logged in.
 * Returns null if nobody is logged in, or if the stored user
 * no longer exists.
 */
export function getCurrentUser() {
  const session = loadData(KEY_SESSION, null);
  if (!session || !session.userId) return null;
  return findUserById(session.userId);
}

/**
 * Log out.
 */
export function clearSession() {
  return removeData(KEY_SESSION);
}

// ---------- Page guard ----------

/**
 * Guard a protected page. Call FIRST on any logged-in page.
 *
 * - Not logged in        → redirect to auth.html
 * - Logged in, wrong role→ redirect to their own dashboard
 * - Logged in, right role→ returns the user
 */
export function requireAuth(requiredRole) {
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
 * Relative path to a role's dashboard, from inside a subfolder.
 */
function dashboardPathFor(role) {
  if (role === ROLES.CUSTOMER) return "../customer/dashboard.html";
  if (role === ROLES.PROVIDER) return "../provider/dashboard.html";
  if (role === ROLES.ADMIN)    return "../admin/dashboard.html";
  return "../auth.html";
}