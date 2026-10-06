// ============================================================
// ZEDCLEANER — assets/js/provider.js
// Page logic for provider/dashboard.html
// ============================================================

import {
  requireAuth, clearSession, getCurrentUser,
} from "../../core/session.js";

import {
  ROLES, CATEGORIES, JOB_STATUS, PROPOSAL_STATUS,
  getOpenJobs, submitProposal,
  getProposalsByProvider, getJobsByHiredProvider,
  findJobById, findUserById,
} from "../../core/engine.js";

// ---------- Guard ----------
const user = requireAuth(ROLES.PROVIDER);

// ---------- DOM refs ----------
const welcomeHeading   = document.getElementById("welcome-heading");
const statOpenJobs     = document.getElementById("stat-open-jobs");
const statMyProposals  = document.getElementById("stat-my-proposals");
const statPending      = document.getElementById("stat-pending");
const statHired        = document.getElementById("stat-hired");
const searchInput      = document.getElementById("search-input");
const filterCategory   = document.getElementById("filter-category");
const jobList          = document.getElementById("job-list");
const modalWrap        = document.getElementById("modal-wrap");
const modalTitle       = document.getElementById("modal-title");
const modalJobDetails  = document.getElementById("modal-job-details");
const proposalForm     = document.getElementById("proposal-form");
const proposalPrice    = document.getElementById("proposal-price");
const proposalMessage  = document.getElementById("proposal-message");
const proposalAlert    = document.getElementById("proposal-alert");
const modalClose       = document.getElementById("modal-close");
const myProposalsList  = document.getElementById("my-proposals-list");
const hiredJobsList    = document.getElementById("hired-jobs-list");

// ---------- Navbar ----------
renderNavbar(user);
welcomeHeading.textContent = `Welcome, ${user.name.split(" ")[0]}`;

// ---------- Populate category filter ----------
CATEGORIES.forEach((cat) => {
  const opt = document.createElement("option");
  opt.value = cat;
  opt.textContent = cat;
  filterCategory.appendChild(opt);
});

// ---------- State ----------
let activeJobId = null;
let searchTerm = "";
let activeCategory = "";

// ---------- Wire search & filter ----------
searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderOpenJobs();
});
filterCategory.addEventListener("change", (e) => {
  activeCategory = e.target.value;
  renderOpenJobs();
});

// ---------- Render marketplace ----------
function renderOpenJobs() {
  const allOpen = getOpenJobs();
  const myProposalJobIds = new Set(
    getProposalsByProvider(user.id).map((p) => p.jobId)
  );

  let visible = allOpen;
  if (activeCategory) {
    visible = visible.filter((j) => j.category === activeCategory);
  }
  if (searchTerm) {
    visible = visible.filter((j) =>
      j.title.toLowerCase().includes(searchTerm) ||
      j.description.toLowerCase().includes(searchTerm)
    );
  }

  if (visible.length === 0) {
    jobList.innerHTML = `
      <div class="empty">
        <h3>No jobs match your filters</h3>
        <p>Try clearing the search or picking a different category.</p>
      </div>
    `;
    return;
  }

  visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  jobList.innerHTML = visible.map((job) => {
    const alreadyProposed = myProposalJobIds.has(job.id);
    return `
      <div class="job-card">
        <div class="card-header">
          <h3>${escapeHtml(job.title)}</h3>
          <span class="badge badge-open">OPEN</span>
        </div>
        <p class="desc">${escapeHtml(job.description)}</p>
        <div class="meta">
          <span class="badge badge-category">${escapeHtml(job.category)}</span>
          ${job.location ? `<span>📍 ${escapeHtml(job.location)}</span>` : ""}
          ${job.budget   ? `<span>💰 ${escapeHtml(job.budget)}</span>`   : ""}
          <span>🕒 ${new Date(job.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="mt-4">
          ${
            alreadyProposed
              ? `<span class="badge badge-pending">Proposal sent</span>`
              : `<button class="btn btn-primary btn-sm" data-job-id="${job.id}">Send proposal</button>`
          }
        </div>
      </div>
    `;
  }).join("");

  // Attach proposal buttons
  jobList.querySelectorAll("button[data-job-id]").forEach((btn) => {
    btn.addEventListener("click", () => openProposalModal(btn.dataset.jobId));
  });
}

// ---------- Modal ----------
function openProposalModal(jobId) {
  const job = findJobById(jobId);
  if (!job) return;

  activeJobId = jobId;
  const customer = findUserById(job.customerId);

  modalTitle.textContent = job.title;
  modalJobDetails.innerHTML = `
    <p><strong>Category:</strong> ${escapeHtml(job.category)}</p>
    <p><strong>Description:</strong> ${escapeHtml(job.description)}</p>
    ${job.location ? `<p><strong>Location:</strong> ${escapeHtml(job.location)}</p>` : ""}
    ${job.budget   ? `<p><strong>Customer budget:</strong> ${escapeHtml(job.budget)}</p>`   : ""}
    ${customer ? `<p><strong>Posted by:</strong> ${escapeHtml(customer.name)}</p>` : ""}
  `;

  proposalForm.reset();
  clearAlert(proposalAlert);
  modalWrap.style.display = "flex";
}

function closeModal() {
  modalWrap.style.display = "none";
  activeJobId = null;
}
modalClose.addEventListener("click", closeModal);
modalWrap.addEventListener("click", (e) => {
  if (e.target === modalWrap) closeModal();
});

// ---------- Submit proposal ----------
proposalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert(proposalAlert);

  const price   = proposalPrice.value.trim();
  const message = proposalMessage.value.trim();

  if (!price) {
    return showAlert(proposalAlert, "Please enter your price.");
  }

  const result = submitProposal({
    jobId: activeJobId,
    providerId: user.id,
    price,
    message,
  });

  if (!result.ok) {
    return showAlert(proposalAlert, result.error);
  }

  showAlert(proposalAlert, "Proposal sent!", "success");
  setTimeout(() => {
    closeModal();
    renderOpenJobs();
    renderMyProposals();
    renderStats();
  }, 700);
});

// ---------- Render my proposals ----------
function renderMyProposals() {
  const proposals = getProposalsByProvider(user.id);

  if (proposals.length === 0) {
    myProposalsList.innerHTML = `
      <div class="empty">
        <h3>No proposals yet</h3>
        <p>Browse open jobs above and send your first proposal.</p>
      </div>
    `;
    return;
  }

  proposals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  myProposalsList.innerHTML = proposals.map((p) => {
    const job = findJobById(p.jobId);
    const jobTitle = job ? job.title : "(job deleted)";
    const statusClass = `badge-${p.status}`;

    return `
      <div class="proposal">
        <div class="card-header">
          <strong>${escapeHtml(jobTitle)}</strong>
          <span class="badge ${statusClass}">${p.status.toUpperCase()}</span>
        </div>
        <div class="price">${escapeHtml(p.price)}</div>
        ${p.message ? `<div class="msg">${escapeHtml(p.message)}</div>` : ""}
        <div class="small muted">Sent ${new Date(p.createdAt).toLocaleDateString()}</div>
      </div>
    `;
  }).join("");
}

// ---------- Render hired jobs ----------
function renderHiredJobs() {
  const hired = getJobsByHiredProvider(user.id);

  if (hired.length === 0) {
    hiredJobsList.innerHTML = `
      <div class="empty">
        <h3>No jobs won yet</h3>
        <p>When a customer accepts one of your proposals, it will appear here.</p>
      </div>
    `;
    return;
  }

  hiredJobsList.innerHTML = hired.map((job) => {
    const customer = findUserById(job.customerId);
    return `
      <div class="job-card">
        <div class="card-header">
          <h3>${escapeHtml(job.title)}</h3>
          <span class="badge badge-hired">HIRED</span>
        </div>
        <p class="desc">${escapeHtml(job.description)}</p>
        <div class="meta">
          <span class="badge badge-category">${escapeHtml(job.category)}</span>
          ${job.location ? `<span>📍 ${escapeHtml(job.location)}</span>` : ""}
          ${customer ? `<span>👤 ${escapeHtml(customer.name)}</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

// ---------- Render stats ----------
function renderStats() {
  const openJobs = getOpenJobs().length;
  const myProposals = getProposalsByProvider(user.id);
  const pending = myProposals.filter((p) => p.status === PROPOSAL_STATUS.PENDING).length;
  const hired   = getJobsByHiredProvider(user.id).length;

  statOpenJobs.textContent    = openJobs;
  statMyProposals.textContent = myProposals.length;
  statPending.textContent     = pending;
  statHired.textContent       = hired;
}

// ---------- Helpers ----------
function showAlert(el, msg, type = "error") {
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.style.display = "block";
}
function clearAlert(el) {
  if (!el) return;
  el.textContent = "";
  el.style.display = "none";
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

// ---------- Initial render ----------
renderOpenJobs();
renderMyProposals();
renderHiredJobs();
renderStats();