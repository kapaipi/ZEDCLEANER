// ============================================================
// ZEDCLEANER — assets/js/auth.js
// Page logic for auth.html.
// ============================================================

import {
  createUser,
  loginUser,
  bootstrap,
  ROLES,
  CATEGORIES,
} from "../../core/engine.js";

import { setSession, getCurrentUser } from "../../core/session.js";

bootstrap();

const existing = getCurrentUser();
if (existing) {
  window.location.href = dashboardPathFor(existing.role);
}

const tabLogin      = document.getElementById("tab-login");
const tabSignup     = document.getElementById("tab-signup");
const panelLogin    = document.getElementById("panel-login");
const panelSignup   = document.getElementById("panel-signup");
const loginForm     = document.getElementById("login-form");
const signupForm    = document.getElementById("signup-form");
const loginAlert    = document.getElementById("login-alert");
const signupAlert   = document.getElementById("signup-alert");
const roleOptions   = document.querySelectorAll(".role-option");
const providerExtra = document.getElementById("provider-extra");
const skillsSelect  = document.getElementById("signup-skills");

if (skillsSelect) {
  CATEGORIES.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    skillsSelect.appendChild(opt);
  });
}

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

let selectedRole = ROLES.CUSTOMER;
roleOptions.forEach((el) => {
  el.addEventListener("click", () => {
    roleOptions.forEach((o) => o.classList.remove("selected"));
    el.classList.add("selected");
    selectedRole = el.dataset.role;
    if (providerExtra) {
      providerExtra.style.display =
        selectedRole === ROLES.PROVIDER ? "block" : "none";
    }
  });
});

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

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert(signupAlert);

  const name     = document.getElementById("signup-name").value.trim();
  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm  = document.getElementById("signup-confirm").value;

  if (!name || !email || !password) {
    return showAlert(signupAlert, "Please fill in all required fields.");
  }
  if (password.length < 6) {
    return showAlert(signupAlert, "Password must be at least 6 characters.");
  }
  if (password !== confirm) {
    return showAlert(signupAlert, "Passwords do not match.");
  }

  let phone = "", location = "", experience = "", bio = "", skills = [];
  if (selectedRole === ROLES.PROVIDER) {
    phone      = document.getElementById("signup-phone")?.value.trim()    || "";
    location   = document.getElementById("signup-location")?.value.trim() || "";
    experience = document.getElementById("signup-experience")?.value.trim() || "";
    bio        = document.getElementById("signup-bio")?.value.trim()      || "";
    if (skillsSelect) {
      skills = Array.from(skillsSelect.selectedOptions).map((o) => o.value);
    }
    if (!phone || !location) {
      return showAlert(signupAlert, "Providers must add a phone number and location.");
    }
  }

  const result = createUser({
    name, email, password,
    role: selectedRole,
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

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert(loginAlert);

  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    return showAlert(loginAlert, "Please enter your email and password.");
  }

  const result = loginUser(email, password);
  if (!result.ok) {
    return showAlert(loginAlert, result.error);
  }

  setSession(result.user);
  showAlert(loginAlert, "Logged in! Redirecting…", "success");
  setTimeout(() => {
    window.location.href = dashboardPathFor(result.user.role);
  }, 400);
});

function dashboardPathFor(role) {
  if (role === ROLES.CUSTOMER) return "customer/dashboard.html";
  if (role === ROLES.PROVIDER) return "provider/dashboard.html";
  if (role === ROLES.ADMIN)    return "admin/dashboard.html";
  return "auth.html";
}