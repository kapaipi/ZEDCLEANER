// ============================================================
// ZEDCLEANER — assets/js/dashboard.js
// Unified dashboard logic. One page, three tabs, all roles.
// ============================================================

import {
  requireAuth, clearSession,
} from "../../core/session.js";

import {
  CATEGORIES, JOB_STATUS, PROPOSAL_STATUS,
  createJob, getOpenJobs, getJobsByCustomer,
  getProposalsByJob, getProposalsByProvider,
  submitProposal, acceptProposal, rejectProposal,
  findJobById, findUserById,
} from "../../core/engine.js";

// ---------- Guard ----------
const user = requireAuth();
if (!user) throw new Error("Not authenticated"); // stops the rest if redirected

// ---------- DOM refs ----------
const welcomeHeading   = document.getElementById("welcome-heading");
const tabMarket        = document.getElementById("tab-market");
const tabMyJobs        = document.getElementById("tab-myjobs");
const tabMyProposals   = document.getElementById("tab-myproposals");
const panelMarket      = document.getElementById("panel-market");
const panelMyJobs      = document.getElementById("panel-myjobs");
const panelMyProposals = document.getElementById("panel-myproposals");

// Stats
const statOpenJobs    = document.getElementById("stat-open-jobs");
const statMyJobs      = document.getElementById("stat-my-jobs");
const statMyProposals = document.getElementById("stat-my-proposals");
const statWon         = document.getElementById("stat-won");

// Marketplace panel
const searchInput     = document.getElementById("search-input");
const filterCategory  = document.getElementById("filter-category");
const marketplaceList = document.getElementById("marketplace-list");

// My jobs panel
const btnNewJob       = document.getElementById("btn-new-job");
const jobFormWrap     = document.getElementById("job-form-wrap");
const jobForm         = document.getElementById("job-form");
const jobCategory     = document.getElementById("job-category");
const jobAlert        = document.getElementById("job-alert");
const myJobsList      = document.getElementById("my-jobs-list");

// My proposals panel
const myProposalsList = document.getElementById("my-proposals-list");

// Proposal modal
const propModalWrap   = document.getElementById("prop-modal-wrap");
const propModalTitle  = document.getElementById("prop-modal-title");
const propModalBody   = document.getElementById("prop-modal-body");
const propModalClose  = document.getElementById("prop-modal-close");
const proposalForm    = document.getElementById("proposal-form");
const proposalPrice   = document.getElementById("proposal-price");
const proposalMessage = document.getElementById("proposal-message");
const proposalAlert   = document.getElementById("proposal-alert");
const propJobBody     = document.getElementById("prop-job-body");

// Proposals-for-my-job modal
const viewModalWrap   = document.getElementById("view-modal-wrap");
const viewModalTitle  = document.getElementById("view-modal-title");
const viewModalBody   = document.getElementById("view-modal-body");
const viewModalClose  = document.getElementById("view-modal-close");

// ---------- Navbar & welcome ----------
renderNavbar(user);
welcomeHeading.textContent = `Welcome, ${user.name.split(" ")[0]}`;

// ---------- Populate category dropdowns ----------
CATEGORIES.forEach((cat) => {
  const opt1 = document.createElement("option");
  opt1.value = cat; opt1.textContent = cat;
  filterCategory.appendChild(opt1);

  const opt2 = document.createElement("option");
  opt2.value = cat; opt2.textContent = cat;
  jobCategory.appendChild(opt2);
});

// ---------- Tab switching ----------
const tabs = [
  { btn: tabMarket,      panel: panelMarket },
  { btn: tabMyJobs,      panel: panelMyJobs },
  { btn: tabMyProposals, panel: panelMyProposals },
];
function showTab(index) {
  tabs.forEach((t, i) => {
    t.btn.classList.toggle("active", i === index);
    t.panel.style.display = i === index ? "block" : "none";
  });
}
tabs.forEach((t, i) => t.btn.addEventListener("click", () => showTab(i)));
showTab(0);

// ============================================================
// MARKETPLACE TAB
// ============================================================
let searchTerm = "";
let activeCategory = "";

searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderMarketplace();
});
filterCategory.addEventListener("change", (e) => {
  activeCategory = e.target.value;
  renderMarketplace();
});

function renderMarketplace() {
  const allOpen = getOpenJobs();
  const myProposalJobIds = new Set(
    getProposalsByProvider(user.id).map((p) => p.jobId)
  );

  let visible = allOpen.filter((j) => j.customerId !== user.id);
  if (activeCategory) visible = visible.filter((j) => j.category === activeCategory);
  if (searchTerm) {
    visible = visible.filter((j) =>
      j.title.toLowerCase().includes(searchTerm) ||
      j.description.toLowerCase().includes(searchTerm)
    );
  }

  if (visible.length === 0) {
    marketplaceList.innerHTML = `
      <div class="empty">
        <h3>No jobs match your filters</h3>
        <p>Try clearing the search or picking a different category.</p>
      </div>
    `;
    return;
  }

  visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  marketplaceList.innerHTML = visible.map((job) => {
    const alreadyProposed = myProposalJobIds.has(job.id);
    const owner = findUserById(job.customerId);
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
          ${owner        ? `<span>👤 ${escapeHtml(owner.name)}</span>`    : ""}
          <span>🕒 ${new Date(job.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="mt-4">
          ${
            alreadyProposed
              ? `<span class="badge badge-pending">Proposal sent</span>`
              : `<button class="btn btn-primary btn-sm" data-propose="${job.id}">Send proposal</button>`
          }
        </div>
      </div>
    `;
  }).join("");

  marketplaceList.querySelectorAll("button[data-propose]").forEach((btn) => {
    btn.addEventListener("click", () => openProposalModal(btn.dataset.propose));
  });
}

// ---------- Proposal modal ----------
function openProposalModal(jobId) {
  const job = findJobById(jobId);
  if (!job) return;

  const owner = findUserById(job.customerId);
  propModalTitle.textContent = job.title;
  propJobBody.innerHTML = `
    <p><strong>Category:</strong> ${escapeHtml(job.category)}</p>
    <p><strong>Description:</strong> ${escapeHtml(job.description)}</p>
    ${job.location ? `<p><strong>Location:</strong> ${escapeHtml(job.location)}</p>` : ""}
    ${job.budget   ? `<p><strong>Customer budget:</strong> ${escapeHtml(job.budget)}</p>` : ""}
    ${owner        ? `<p><strong>Posted by:</strong> ${escapeHtml(owner.name)}</p>` : ""}
  `;
  proposalForm.dataset.jobId = jobId;
  proposalForm.reset();
  clearAlert(proposalAlert);
  propModalWrap.style.display = "flex";
}

propModalClose.addEventListener("click", () => {
  propModalWrap.style.display = "none";
});
propModalWrap.addEventListener("click", (e) => {
  if (e.target === propModalWrap) propModalWrap.style.display = "none";
});

proposalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert(proposalAlert);

  const price   = proposalPrice.value.trim();
  const message = proposalMessage.value.trim();

  if (!price) return showAlert(proposalAlert, "Please enter your price.");

  const result = submitProposal({
    jobId: proposalForm.dataset.jobId,
    providerId: user.id,
    price, message,
  });

  if (!result.ok) return showAlert(proposalAlert, result.error);

  showAlert(proposalAlert, "Proposal sent!", "success");
  setTimeout(() => {
    propModalWrap.style.display = "none";
    renderMarketplace();
    renderMyProposals();
    renderStats();
  }, 700);
});

// ============================================================
// MY JOBS TAB
// ============================================================
btnNewJob.addEventListener("click", () => {
  const showing = jobFormWrap.style.display !== "none";
  jobFormWrap.style.display = showing ? "none" : "block";
  btnNewJob.textContent = showing ? "Post a new job" : "Cancel";
  if (!showing) {
    jobForm.reset();
    clearAlert(jobAlert);
  }
});

jobForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert(jobAlert);

  const title       = document.getElementById("job-title").value.trim();
  const category    = jobCategory.value;
  const description = document.getElementById("job-description").value.trim();
  const location    = document.getElementById("job-location").value.trim();
  const budget      = document.getElementById("job-budget").value.trim();

  if (!title || !category || !description) {
    return showAlert(jobAlert, "Please fill in title, category and description.");
  }

  const result = createJob({
    customerId: user.id,
    title, category, description, location, budget,
  });

  if (!result.ok) return showAlert(jobAlert, result.error);

  showAlert(jobAlert, "Job posted successfully!", "success");
  jobForm.reset();

  setTimeout(() => {
    jobFormWrap.style.display = "none";
    btnNewJob.textContent = "Post a new job";
    clearAlert(jobAlert);
    renderMyJobs();
    renderStats();
  }, 600);
});

function renderMyJobs() {
  const jobs = getJobsByCustomer(user.id);

  if (jobs.length === 0) {
    myJobsList.innerHTML = `
      <div class="empty">
        <h3>No jobs posted yet</h3>
        <p>Click "Post a new job" to create your first request.</p>
      </div>
    `;
    return;
  }

  jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  myJobsList.innerHTML = jobs.map((job) => {
    const proposals = getProposalsByJob(job.id);
    const statusClass = `badge-${job.status}`;
    const canView = proposals.length > 0;

    return `
      <div class="job-card">
        <div class="card-header">
          <h3>${escapeHtml(job.title)}</h3>
          <span class="badge ${statusClass}">${job.status.toUpperCase()}</span>
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
              ? `<button class="btn btn-primary btn-sm" data-view="${job.id}">View proposals</button>`
              : `<span class="small muted">Waiting for proposals…</span>`
          }
        </div>
      </div>
    `;
  }).join("");

  myJobsList.querySelectorAll("button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => openViewModal(btn.dataset.view));
  });
}

// ---------- View proposals modal ----------
function openViewModal(jobId) {
  const job = getJobsByCustomer(user.id).find((j) => j.id === jobId);
  if (!job) return;

  viewModalTitle.textContent = `Proposals for: ${job.title}`;

  const proposals = getProposalsByJob(jobId);
  const isHired = job.status === JOB_STATUS.HIRED;

  const html = proposals.length === 0
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
    ? `<div class="alert alert-success">You have hired a provider for this job.</div>`
    : "";

  viewModalBody.innerHTML = hireNote + html;

  viewModalBody.querySelectorAll("button[data-accept]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const result = acceptProposal(btn.dataset.accept);
      if (!result.ok) { alert(result.error); return; }
      openViewModal(jobId);
      renderMyJobs();
      renderStats();
      renderMarketplace();
    });
  });
  viewModalBody.querySelectorAll("button[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const result = rejectProposal(btn.dataset.reject);
      if (!result.ok) { alert(result.error); return; }
      openViewModal(jobId);
      renderMyJobs();
      renderStats();
    });
  });

  viewModalWrap.style.display = "flex";
}

viewModalClose.addEventListener("click", () => {
  viewModalWrap.style.display = "none";
});
viewModalWrap.addEventListener("click", (e) => {
  if (e.target === viewModalWrap) viewModalWrap.style.display = "none";
});

// ============================================================
// MY PROPOSALS TAB
// ============================================================
function renderMyProposals() {
  const proposals = getProposalsByProvider(user.id);

  if (proposals.length === 0) {
    myProposalsList.innerHTML = `
      <div class="empty">
        <h3>No proposals sent yet</h3>
        <p>Browse the Marketplace tab and send your first proposal.</p>
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

// ============================================================
// STATS
// ============================================================
function renderStats() {
  const openJobs     = getOpenJobs().filter((j) => j.customerId !== user.id).length;
  const myJobs       = getJobsByCustomer(user.id).length;
  const myProposals  = getProposalsByProvider(user.id);
  const wonCount     = myProposals.filter((p) => p.status === PROPOSAL_STATUS.ACCEPTED).length;

  statOpenJobs.textContent    = openJobs;
  statMyJobs.textContent      = myJobs;
  statMyProposals.textContent = myProposals.length;
  statWon.textContent         = wonCount;
}

// ============================================================
// HELPERS
// ============================================================
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
        <a href="../index.html" class="brand">ZED<span>CLEANER</span></a>
        <nav class="nav-links">
          <span class="small muted">Hi, ${escapeHtml(u.name)}</span>
          <button id="btn-logout" class="btn btn-ghost btn-sm" type="button">Log out</button>
        </nav>
      </div>
    </header>
  `;
  document.getElementById("btn-logout").addEventListener("click", () => {
    clearSession();
    window.location.href = "../auth.html";
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// INITIAL RENDER
// ============================================================
renderMarketplace();
renderMyJobs();
renderMyProposals();
renderStats();