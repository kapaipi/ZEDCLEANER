// ============================================================
// ZEDCLEANER — assets/js/dashboard.js
// Unified dashboard, backed by Firebase (async).
// Includes image upload to Firebase Storage.
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

import {
  ref, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { storage } from "../../core/firebase.js";

// ============================================================
// BOOT
// ============================================================
init();

async function init() {
  const user = await requireAuth();
  if (!user) return; // redirected

  // ---------- DOM refs ----------
  const welcomeHeading   = document.getElementById("welcome-heading");
  const tabMarket        = document.getElementById("tab-market");
  const tabMyJobs        = document.getElementById("tab-myjobs");
  const tabMyProposals   = document.getElementById("tab-myproposals");
  const panelMarket      = document.getElementById("panel-market");
  const panelMyJobs      = document.getElementById("panel-myjobs");
  const panelMyProposals = document.getElementById("panel-myproposals");

  const statOpenJobs    = document.getElementById("stat-open-jobs");
  const statMyJobs      = document.getElementById("stat-my-jobs");
  const statMyProposals = document.getElementById("stat-my-proposals");
  const statWon         = document.getElementById("stat-won");

  const searchInput     = document.getElementById("search-input");
  const filterCategory  = document.getElementById("filter-category");
  const marketplaceList = document.getElementById("marketplace-list");

  const btnNewJob    = document.getElementById("btn-new-job");
  const jobFormWrap  = document.getElementById("job-form-wrap");
  const jobForm      = document.getElementById("job-form");
  const jobCategory  = document.getElementById("job-category");
  const jobAlert     = document.getElementById("job-alert");
  const jobImages    = document.getElementById("job-images");
  const imagePreview = document.getElementById("image-preview");
  const myJobsList   = document.getElementById("my-jobs-list");

  const myProposalsList = document.getElementById("my-proposals-list");

  const propModalWrap   = document.getElementById("prop-modal-wrap");
  const propModalTitle  = document.getElementById("prop-modal-title");
  const propModalBody   = document.getElementById("prop-modal-body");
  const propModalClose  = document.getElementById("prop-modal-close");
  const proposalForm    = document.getElementById("proposal-form");
  const proposalPrice   = document.getElementById("proposal-price");
  const proposalMessage = document.getElementById("proposal-message");
  const proposalAlert   = document.getElementById("proposal-alert");
  const propJobBody     = document.getElementById("prop-job-body");

  const viewModalWrap   = document.getElementById("view-modal-wrap");
  const viewModalTitle  = document.getElementById("view-modal-title");
  const viewModalBody   = document.getElementById("view-modal-body");
  const viewModalClose  = document.getElementById("view-modal-close");

  // ---------- Navbar & welcome ----------
  renderNavbar(user);
  welcomeHeading.textContent = `Welcome, ${user.name.split(" ")[0]}`;

  // ---------- Populate category dropdowns ----------
  CATEGORIES.forEach((cat) => {
    const o1 = document.createElement("option");
    o1.value = cat; o1.textContent = cat;
    filterCategory.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = cat; o2.textContent = cat;
    jobCategory.appendChild(o2);
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

  async function renderMarketplace() {
    const allOpen = await getOpenJobs();
    const myProposals = await getProposalsByProvider(user.id);
    const myProposalJobIds = new Set(myProposals.map((p) => p.jobId));

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

    // Fetch owner names (one call per unique owner, cached)
    const ownerCache = {};
    for (const job of visible) {
      if (!ownerCache[job.customerId]) {
        ownerCache[job.customerId] = await findUserById(job.customerId);
      }
    }

    marketplaceList.innerHTML = visible.map((job) => {
      const alreadyProposed = myProposalJobIds.has(job.id);
      const owner = ownerCache[job.customerId];
      return `
        <div class="job-card">
          <div class="card-header">
            <h3>${escapeHtml(job.title)}</h3>
            <span class="badge badge-open">OPEN</span>
          </div>
          ${renderImages(job.images)}
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
  async function openProposalModal(jobId) {
    const job = await findJobById(jobId);
    if (!job) return;

    const owner = await findUserById(job.customerId);
    propModalTitle.textContent = job.title;
    propJobBody.innerHTML = `
      ${renderImages(job.images)}
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

  proposalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(proposalAlert);

    const price   = proposalPrice.value.trim();
    const message = proposalMessage.value.trim();

    if (!price) return showAlert(proposalAlert, "Please enter your price.");

    showAlert(proposalAlert, "Sending…", "info");

    const result = await submitProposal({
      jobId: proposalForm.dataset.jobId,
      providerId: user.id,
      price, message,
    });

    if (!result.ok) return showAlert(proposalAlert, result.error);

    showAlert(proposalAlert, "Proposal sent!", "success");
    setTimeout(async () => {
      propModalWrap.style.display = "none";
      await renderMarketplace();
      await renderMyProposals();
      await renderStats();
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
      imagePreview.innerHTML = "";
      clearAlert(jobAlert);
    }
  });

  // ---------- Image preview ----------
  jobImages?.addEventListener("change", () => {
    imagePreview.innerHTML = "";
    const files = Array.from(jobImages.files).slice(0, 5);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.src = url;
      img.style.cssText = "width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--line);";
      imagePreview.appendChild(img);
    });
  });

  // ---------- Upload images to Firebase Storage ----------
  async function uploadImages(files) {
    const urls = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `jobs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storageRef = ref(storage, path);
      const snap = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snap.ref);
      urls.push(url);
    }
    return urls;
  }

  jobForm.addEventListener("submit", async (e) => {
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

    // Upload images first (if any)
    let images = [];
    const files = jobImages?.files ? Array.from(jobImages.files).slice(0, 5) : [];
    if (files.length > 0) {
      showAlert(jobAlert, `Uploading ${files.length} image${files.length === 1 ? "" : "s"}…`, "info");
      try {
        images = await uploadImages(files);
      } catch (err) {
        return showAlert(jobAlert, "Image upload failed: " + err.message);
      }
    }

    showAlert(jobAlert, "Posting job…", "info");

    const result = await createJob({
      customerId: user.id,
      title, category, description, location, budget, images,
    });

    if (!result.ok) return showAlert(jobAlert, result.error);

    showAlert(jobAlert, "Job posted successfully!", "success");
    jobForm.reset();
    imagePreview.innerHTML = "";

    setTimeout(async () => {
      jobFormWrap.style.display = "none";
      btnNewJob.textContent = "Post a new job";
      clearAlert(jobAlert);
      await renderMyJobs();
      await renderStats();
    }, 700);
  });

  async function renderMyJobs() {
    const jobs = await getJobsByCustomer(user.id);

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

    const rows = [];
    for (const job of jobs) {
      const proposals = await getProposalsByJob(job.id);
      const statusClass = `badge-${job.status}`;
      const canView = proposals.length > 0;

      rows.push(`
        <div class="job-card">
          <div class="card-header">
            <h3>${escapeHtml(job.title)}</h3>
            <span class="badge ${statusClass}">${job.status.toUpperCase()}</span>
          </div>
          ${renderImages(job.images)}
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
      `);
    }
    myJobsList.innerHTML = rows.join("");

    myJobsList.querySelectorAll("button[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => openViewModal(btn.dataset.view));
    });
  }

  // ---------- View proposals modal ----------
  async function openViewModal(jobId) {
    const jobs = await getJobsByCustomer(user.id);
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    viewModalTitle.textContent = `Proposals for: ${job.title}`;

    const proposals = await getProposalsByJob(jobId);
    const isHired = job.status === JOB_STATUS.HIRED;

    let html = "";
    if (proposals.length === 0) {
      html = `<div class="empty"><p>No proposals yet.</p></div>`;
    } else {
      const rows = [];
      for (const p of proposals) {
        const provider = await findUserById(p.providerId);
        const providerName = provider ? provider.name : "(unknown)";
        const statusClass = `badge-${p.status}`;
        const showActions = !isHired && p.status === PROPOSAL_STATUS.PENDING;

        rows.push(`
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
        `);
      }
      html = rows.join("");
    }

    const hireNote = isHired
      ? `<div class="alert alert-success">You have hired a provider for this job.</div>`
      : "";

    viewModalBody.innerHTML = hireNote + html;

    viewModalBody.querySelectorAll("button[data-accept]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Accepting…";
        const result = await acceptProposal(btn.dataset.accept);
        if (!result.ok) { alert(result.error); btn.disabled = false; return; }
        await openViewModal(jobId);
        await renderMyJobs();
        await renderStats();
        await renderMarketplace();
      });
    });
    viewModalBody.querySelectorAll("button[data-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Rejecting…";
        const result = await rejectProposal(btn.dataset.reject);
        if (!result.ok) { alert(result.error); btn.disabled = false; return; }
        await openViewModal(jobId);
        await renderMyJobs();
        await renderStats();
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
  async function renderMyProposals() {
    const proposals = await getProposalsByProvider(user.id);

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

    const rows = [];
    for (const p of proposals) {
      const job = await findJobById(p.jobId);
      const jobTitle = job ? job.title : "(job deleted)";
      const statusClass = `badge-${p.status}`;
      rows.push(`
        <div class="proposal">
          <div class="card-header">
            <strong>${escapeHtml(jobTitle)}</strong>
            <span class="badge ${statusClass}">${p.status.toUpperCase()}</span>
          </div>
          <div class="price">${escapeHtml(p.price)}</div>
          ${p.message ? `<div class="msg">${escapeHtml(p.message)}</div>` : ""}
          <div class="small muted">Sent ${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
      `);
    }
    myProposalsList.innerHTML = rows.join("");
  }

  // ============================================================
  // STATS
  // ============================================================
  async function renderStats() {
    const allOpen    = await getOpenJobs();
    const myJobs     = await getJobsByCustomer(user.id);
    const myProposals = await getProposalsByProvider(user.id);
    const wonCount   = myProposals.filter((p) => p.status === PROPOSAL_STATUS.ACCEPTED).length;

    statOpenJobs.textContent    = allOpen.filter((j) => j.customerId !== user.id).length;
    statMyJobs.textContent      = myJobs.length;
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

  function renderImages(images) {
    if (!Array.isArray(images) || images.length === 0) return "";
    const thumbs = images.map((url) =>
      `<img src="${url}" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--line);" />`
    ).join("");
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:var(--sp-2) 0;">${thumbs}</div>`;
  }

  // ============================================================
  // INITIAL RENDER
  // ============================================================
  await renderMarketplace();
  await renderMyJobs();
  await renderMyProposals();
  await renderStats();
}