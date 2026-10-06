// ============================================================
// ZEDCLEANER — assets/js/customer.js
// Page logic for customer/dashboard.html
// Includes proposal viewing and acceptance.
// ============================================================

import {
  requireAuth, clearSession,
} from "../../core/session.js";

import {
  ROLES, CATEGORIES, JOB_STATUS, PROPOSAL_STATUS,
  createJob, getJobsByCustomer,
  getProposalsByJob, acceptProposal, rejectProposal,
  findUserById,
} from "../../core/engine.js";

const user = requireAuth(ROLES.CUSTOMER);

const welcomeHeading    = document.getElementById("welcome-heading");
const statTotal         = document.getElementById("stat-total");
const statOpen          = document.getElementById("stat-open");
const statHired         = document.getElementById("stat-hired");
const statProposals     = document.getElementById("stat-proposals");
const btnNewJob         = document.getElementById("btn-new-job");
const jobFormWrap       = document.getElementById("job-form-wrap");
const jobForm           = document.getElementById("job-form");
const jobCategory       = document.getElementById("job-category");
const jobAlert          = document.getElementById("job-alert");
const jobList           = document.getElementById("job-list");
const modalWrap         = document.getElementById("modal-wrap");
const modalTitle        = document.getElementById("modal-title");
const modalJobBody      = document.getElementById("modal-job-body");
const modalClose        = document.getElementById("modal-close");

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

  if (!result.ok) return showAlert(result.error);

  showAlert("Job posted successfully!", "success");
  jobForm.reset();

  setTimeout(() => {
    jobFormWrap.style.display = "none";
    btnNewJob.textContent = "Post a new job";
    clearAlert();
    renderJobs();
  }, 600);
});

// ---------- Render jobs ----------
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
    const canView = proposals.length > 0;

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
        <div class="mt-4 flex-between">
          <span class="small muted">
            ${proposals.length} proposal${proposals.length === 1 ? "" : "s"} received
          </span>
          ${
            canView
              ? `<button class="btn btn-primary btn-sm" data-open-proposals="${job.id}">View proposals</button>`
              : `<span class="small muted">Waiting for proposals…</span>`
          }
        </div>
      </div>
    `;
  }).join("");

  // Attach "View proposals" buttons
  jobList.querySelectorAll("button[data-open-proposals]").forEach((btn) => {
    btn.addEventListener("click", () => openProposalsModal(btn.dataset.openProposals));
  });
}

// ---------- Proposals modal ----------
function openProposalsModal(jobId) {
  const job = getJobsByCustomer(user.id).find((j) => j.id === jobId);
  if (!job) return;

  modalTitle.textContent = `Proposals for: ${job.title}`;

  const proposals = getProposalsByJob(jobId);
  const isHired = job.status === JOB_STATUS.HIRED;

  const proposalsHtml = proposals.length === 0
    ? `<div class="empty"><p>No proposals yet.</p></div>`
    : proposals.map((p) => {
        const provider = findUserById(p.providerId);
        const providerName = provider ? provider.name : "(unknown)";
        const statusClass = `badge-${p.status}`;
        const showActions = !isHired && p.status === PROPOSAL_STATUS.PENDING;

        return `
          <div class="proposal">
            <div class="card-header">
              <strong>${escapeHtml(providerName)}</strong>
              <span class="badge ${statusClass}">${p.status.toUpperCase()}</span>
            </div>
            <div class="price">${escapeHtml(p.price)}</div>
            ${p.message ? `<div class="msg">${escapeHtml(p.message)}</div>` : ""}
            <div class="small muted mb-2">
              Sent ${new Date(p.createdAt).toLocaleDateString()}
            </div>
            ${
              showActions
                ? `<div class="actions">
                     <button class="btn btn-success btn-sm" data-accept="${p.id}">Accept</button>
                     <button class="btn btn-ghost btn-sm" data-reject="${p.id}">Reject</button>
                   </div>`
                : ""
            }
          </div>
        `;
      }).join("");

  const hireNote = isHired
    ? `<div class="alert alert-success">You have already hired a provider for this job.</div>`
    : "";

  modalJobBody.innerHTML = hireNote + proposalsHtml;

  // Attach accept/reject listeners
  modalJobBody.querySelectorAll("button[data-accept]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const result = acceptProposal(btn.dataset.accept);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      openProposalsModal(jobId); // refresh modal
      renderJobs();
    });
  });
  modalJobBody.querySelectorAll("button[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const result = rejectProposal(btn.dataset.reject);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      openProposalsModal(jobId);
      renderJobs();
    });
  });

  modalWrap.style.display = "flex";
}

function closeModal() {
  modalWrap.style.display = "none";
}
modalClose.addEventListener("click", closeModal);
modalWrap.addEventListener("click", (e) => {
  if (e.target === modalWrap) closeModal();
});

// ---------- Helpers ----------
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