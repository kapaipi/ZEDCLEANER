// ============================================================
// ZEDCLEANER — assets/js/auth.js
// Signup + login using Firebase-backed engine (async).
// ============================================================

import {
  createUser,
  loginUser,
  bootstrap,
  ROLES,
  CATEGORIES,
} from "../../core/engine.js";

import { setSession, getCurrentUser } from "../../core/session.js";

// ---------- Run bootstrap (admin creation) before anything else ----------
init();

async function init() {
  await bootstrap();

  // If already logged in, redirect to dashboard
  const existing = await getCurrentUser();
  if (existing) {
    window.location.href = dashboardPathFor(existing.role);
    return;
  }

  // ---------- DOM ----------
  const tabLogin    = document.getElementById("tab-login");
  const tabSignup   = document.getElementById("tab-signup");
  const panelLogin  = document.getElementById("panel-login");
  const panelSignup = document.getElementById("panel-signup");
  const loginForm   = document.getElementById("login-form");
  const signupForm  = document.getElementById("signup-form");
  const loginAlert  = document.getElementById("login-alert");
  const signupAlert = document.getElementById("signup-alert");
  const skillsSelect = document.getElementById("signup-skills");

  // Populate skills dropdown
  if (skillsSelect) {
    CATEGORIES.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      skillsSelect.appendChild(opt);
    });
  }

  // ---------- Tabs ----------
  function showTab(which) {
    const isLogin = which === "login";
    tabLogin.classList.toggle("active", isLogin);
    tabSignup.classList.toggle("active", !isLogin);
    panelLogin.style.display  = isLogin ? "block" : "none";
    panelSignup.style.display = isLogin ? "none"  : "block";
    clearAlert(loginAlert);
    clearAlert(signupAlert);
  }
  tabLogin.addEventListener("click",  () => showTab("login"));
  tabSignup.addEventListener("click", () => showTab("signup"));
  showTab("login");

  // ---------- Alerts ----------
  function showAlert(el, message, type = "error") {
    if (!el) return;
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.style.display = "block";
  }
  function clearAlert(el) {
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
  }

  // ---------- Signup ----------
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(signupAlert);

    const name     = document.getElementById("signup-name").value.trim();
    const email    = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirm  = document.getElementById("signup-confirm").value;
    const phone    = document.getElementById("signup-phone")?.value.trim() || "";
    const location = document.getElementById("signup-location")?.value.trim() || "";
    const experience = document.getElementById("signup-experience")?.value.trim() || "";
    const bio      = document.getElementById("signup-bio")?.value.trim() || "";
    const skills   = skillsSelect
      ? Array.from(skillsSelect.selectedOptions).map((o) => o.value)
      : [];

    if (!name || !email || !password) {
      return showAlert(signupAlert, "Please fill in name, email, and password.");
    }
    if (password.length < 6) {
      return showAlert(signupAlert, "Password must be at least 6 characters.");
    }
    if (password !== confirm) {
      return showAlert(signupAlert, "Passwords do not match.");
    }

    showAlert(signupAlert, "Creating account…", "info");

    const result = await createUser({
      name, email, password,
      phone, location, skills, experience, bio,
    });

    if (!result.ok) {
      return showAlert(signupAlert, result.error);
    }

    setSession(result.user);
    showAlert(signupAlert, "Account created! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = dashboardPathFor(result.user.role);
    }, 500);
  });

  // ---------- Login ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(loginAlert);

    const email    = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      return showAlert(loginAlert, "Please enter your email and password.");
    }

    showAlert(loginAlert, "Logging in…", "info");

    const result = await loginUser(email, password);
    if (!result.ok) {
      return showAlert(loginAlert, result.error);
    }

    setSession(result.user);
    showAlert(loginAlert, "Logged in! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = dashboardPathFor(result.user.role);
    }, 400);
  });
}

// ---------- Dashboard path ----------
function dashboardPathFor(role) {
  if (role === ROLES.ADMIN) return "admin/dashboard.html";
  return "dashboard.html";
}