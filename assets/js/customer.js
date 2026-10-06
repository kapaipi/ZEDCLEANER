// ============================================================
// ZEDCLEANER — assets/js/customer.js
// Page logic for customer/dashboard.html
// ============================================================

import {
  requireAuth, clearSession,
} from "../../core/session.js";

import {
  ROLES, CATEGORIES, JOB_STATUS,
  createJob, getJobsByCustomer, getProposalsByJob,
} from "../../core/engine.js";

const user = requireAuth(ROLES.CUSTOMER);

const welcomeHeading = document.getElementById("welcome-heading");
const statTotal      = document.getElementById("stat-total");
const statOpen       = document.getElementById("stat-open");
const statHired      = document.getElementById("stat-hired");
const statProposals  = document.getElementById("stat-proposals");
const btnNewJob      = document.getElementById("btn-new-job");
const jobFormWrap    = document.getElementById("job-form-wrap");
const jobForm        = document.getElementById("job-form");
const jobCategory    = document.getElementById("job-category");
const jobAlert       = document.getElementById("job-alert");
const jobList        = document.getElementById("job-list");

renderNavbar(user);

welcomeHeading.textContent = `Welcome, ${user.name.split(" ")[0]}`;

CATEGORIES.forEach((cat) => {
  const opt = document.createElement("option");
  opt.value = cat;
  opt.textContent = cat;
  jobCategory.appendChild(opt);
});

btnNewJob.addEventListener("click", () => {
  const showing = jobFormWrap.style.display !== "none";
  jobFormWrap.style.display = showing ? "none" : "block";
  btnNewJob.textContent = showing ? "Post a new job" : "Cancel";
  if (!showing) {
    jobForm.reset();
    clearAlert();
  }
});

jobForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert();

  const title       = document.getElementById("job-title").value.trim();
  const category    = jobCategory.value;
  const description = document.getElementById("job-description").value.trim();
  const location    = document.getElementById("job-location").value.trim();
  const budget      = document.getElementById("job-budget").value.trim();

  if (!title || !category || !description) {
    return showAlert("Please fill in title, category and description.");
  }

  const result = createJob({
    customerId: user.id,
    title, category, description, location, budget,
  });

  if (!result.ok) {
    return showAlert(result.error);
  }

  showAlert("Job posted successfully!", "success");
  jobForm.reset();

  setTimeout(() => {
    jobFormWrap.style.display = "none";
    btnNewJob.textContent = "Post a new job";
    clearAlert();
    renderJobs();
  }, 600);
});

function renderJobs() {
  const jobs = getJobsByCustomer(user.id);

  const open  = jobs.filter((j) => j.status === JOB_STATUS.OPEN).length;
  const hired = jobs.filter((j) => j.status === JOB_STATUS.HIRED).length;
  const props = jobs.reduce((sum, j) => sum + getProposalsByJob(j.id).length, 0);

  statTotal.textContent     = jobs.length;
  statOpen.textContent      = open;
  statHired.textContent     = hired;
  statProposals.textContent = props;

  if (jobs.length === 0) {
    jobList.innerHTML = `
      <div class="empty">
        <h3>No jobs yet</h3>
        <p>Click "Post a new job" to get your first request out there.</p>
      </div>
    `;
    return;
  }

  jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  jobList.innerHTML = jobs.map((job) => {
    const proposals = getProposalsByJob(job.id);
    const statusLabel = job.status.toUpperCase();
    const statusClass = `badge-${job.status}`;

    return `
      <div class="job-card">
        <div class="card-header">
          <h3>${escapeHtml(job.title)}</h3>
          <span class="badge ${statusClass}">${statusLabel}</span>
        </div>
        <p class="desc">${escapeHtml(job.description)}</p>
        <div class="meta">
          <span class="badge badge-category">${escapeHtml(job.category)}</span>
          ${job.location ? `<span>📍 ${escapeHtml(job.location)}</span>` : ""}
          ${job.budget   ? `<span>💰 ${escapeHtml(job.budget)}</span>`   : ""}
          <span>🕒 ${new Date(job.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="mt-4 small muted">
          ${proposals.length} proposal${proposals.length === 1 ? "" : "s"} received
        </div>
      </div>
    `;
  }).join("");
}

function showAlert(msg, type = "error") {
  jobAlert.textContent = msg;
  jobAlert.className = `alert alert-${type}`;
  jobAlert.style.display = "block";
}
function clearAlert() {
  jobAlert.textContent = "";
  jobAlert.style.display = "none";
}

function renderNavbar(u) {
  const slot = document.getElementById("navbar-slot");
  slot.innerHTML = `
    <header class="navbar">
      <div class="container navbar-inner">
        <a href="../../index.html" class="brand">ZED<span>CLEANER</span></a>
        <nav class="nav-links">
          <span class="small muted">Hi, ${escapeHtml(u.name)}</span>
          <button id="btn-logout" class="btn btn-ghost btn-sm" type="button">Log out</button>
        </nav>
      </div>
    </header>
  `;
  document.getElementById("btn-logout").addEventListener("click", () => {
    clearSession();
    window.location.href = "../../auth.html";
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

renderJobs();