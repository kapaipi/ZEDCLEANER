// ============================================================
// ZEDCLEANER — core/engine.js
// Business logic on top of Firestore.
// Every function that touches the DB is async.
// ============================================================

import {
  addDocTo,
  getAllDocs,
  getDocById,
  updateDocById,
} from "./storage.js";

// ---------- Constants ----------
export const CATEGORIES = [
  "Cleaning",
  "Electrical",
  "Plumbing",
  "Solar installation",
  "Construction",
  "Painting",
  "Transport",
  "Tutoring",
  "Technology",
  "Graphic design",
  "Moving services",
  "Gardening",
  "General services",
];

export const JOB_STATUS = {
  OPEN:   "open",
  HIRED:  "hired",
  CLOSED: "closed",
};

export const PROPOSAL_STATUS = {
  PENDING:  "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
};

export const ROLES = {
  USER:  "user",
  ADMIN: "admin",
};

const COL_USERS     = "users";
const COL_JOBS      = "jobs";
const COL_PROPOSALS = "proposals";

// ============================================================
// BOOTSTRAP — create admin if missing
// ============================================================
export async function bootstrap() {
  const users = await getAllDocs(COL_USERS);
  const adminExists = users.some((u) => u.role === ROLES.ADMIN);
  if (!adminExists) {
    await addDocTo(COL_USERS, {
      name: "ZEDCLEANER Admin",
      email: "admin@zedcleaner.com",
      password: "admin123",
      role: ROLES.ADMIN,
      phone: "",
      location: "",
      skills: [],
      experience: "",
      bio: "",
      createdAt: new Date().toISOString(),
    });
    console.log("[engine] Admin created: admin@zedcleaner.com / admin123");
  }
}

// ============================================================
// USERS
// ============================================================
export async function createUser({ name, email, password, phone = "", location = "", skills = [], experience = "", bio = "" }) {
  if (!name || !email || !password) {
    return { ok: false, error: "Missing required fields." };
  }
  const emailLower = email.trim().toLowerCase();

  const users = await getAllDocs(COL_USERS);
  if (users.some((u) => u.email === emailLower)) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const result = await addDocTo(COL_USERS, {
    name: name.trim(),
    email: emailLower,
    password,
    role: ROLES.USER,
    phone,
    location,
    skills: Array.isArray(skills) ? skills : [],
    experience,
    bio,
    createdAt: new Date().toISOString(),
  });

  if (!result.ok) return result;
  return { ok: true, user: result.data };
}

export async function loginUser(email, password) {
  const emailLower = String(email || "").trim().toLowerCase();
  const users = await getAllDocs(COL_USERS);
  const user = users.find((u) => u.email === emailLower && u.password === password);
  if (!user) return { ok: false, error: "Invalid email or password." };
  return { ok: true, user };
}

export async function findUserById(id) {
  if (!id) return null;
  return await getDocById(COL_USERS, id);
}

export async function getAllUsers() {
  return await getAllDocs(COL_USERS);
}

export async function updateUser(id, updates) {
  delete updates.id;
  delete updates.role;
  return await updateDocById(COL_USERS, id, updates);
}

// ============================================================
// JOBS
// ============================================================
export async function createJob({ customerId, title, category, description, location, budget, images = [] }) {
  if (!customerId || !title || !category || !description) {
    return { ok: false, error: "Missing required job fields." };
  }
  if (!CATEGORIES.includes(category)) {
    return { ok: false, error: "Invalid category." };
  }

  const result = await addDocTo(COL_JOBS, {
    customerId,
    title: title.trim(),
    category,
    description: description.trim(),
    location: (location || "").trim(),
    budget: budget || "",
    images: Array.isArray(images) ? images : [],
    status: JOB_STATUS.OPEN,
    hiredProviderId: null,
    createdAt: new Date().toISOString(),
  });

  if (!result.ok) return result;
  return { ok: true, job: result.data };
}

export async function getAllJobs() {
  return await getAllDocs(COL_JOBS);
}

export async function getOpenJobs() {
  const jobs = await getAllDocs(COL_JOBS);
  return jobs.filter((j) => j.status === JOB_STATUS.OPEN);
}

export async function getJobsByCustomer(customerId) {
  const jobs = await getAllDocs(COL_JOBS);
  return jobs.filter((j) => j.customerId === customerId);
}

export async function findJobById(id) {
  if (!id) return null;
  return await getDocById(COL_JOBS, id);
}

export async function getJobsByHiredProvider(providerId) {
  const jobs = await getAllDocs(COL_JOBS);
  return jobs.filter((j) => j.hiredProviderId === providerId);
}

// ============================================================
// PROPOSALS
// ============================================================
export async function submitProposal({ jobId, providerId, price, message }) {
  if (!jobId || !providerId || !price) {
    return { ok: false, error: "Missing required proposal fields." };
  }
  const job = await findJobById(jobId);
  if (!job) return { ok: false, error: "Job not found." };
  if (job.status !== JOB_STATUS.OPEN) {
    return { ok: false, error: "This job is no longer open." };
  }
  if (job.customerId === providerId) {
    return { ok: false, error: "You cannot propose on your own job." };
  }

  const proposals = await getAllDocs(COL_PROPOSALS);
  if (proposals.some((p) => p.jobId === jobId && p.providerId === providerId)) {
    return { ok: false, error: "You have already proposed on this job." };
  }

  const result = await addDocTo(COL_PROPOSALS, {
    jobId,
    providerId,
    price,
    message: (message || "").trim(),
    status: PROPOSAL_STATUS.PENDING,
    createdAt: new Date().toISOString(),
  });

  if (!result.ok) return result;
  return { ok: true, proposal: result.data };
}

export async function getProposalsByJob(jobId) {
  const proposals = await getAllDocs(COL_PROPOSALS);
  return proposals.filter((p) => p.jobId === jobId);
}

export async function getProposalsByProvider(providerId) {
  const proposals = await getAllDocs(COL_PROPOSALS);
  return proposals.filter((p) => p.providerId === providerId);
}

export async function getAllProposals() {
  return await getAllDocs(COL_PROPOSALS);
}

export async function acceptProposal(proposalId) {
  const proposal = await getDocById(COL_PROPOSALS, proposalId);
  if (!proposal) return { ok: false, error: "Proposal not found." };

  const job = await findJobById(proposal.jobId);
  if (!job) return { ok: false, error: "Job not found." };
  if (job.status !== JOB_STATUS.OPEN) {
    return { ok: false, error: "Job is no longer open." };
  }

  const allProposals = await getAllDocs(COL_PROPOSALS);
  const siblings = allProposals.filter((p) => p.jobId === proposal.jobId);

  // Update every sibling proposal
  for (const p of siblings) {
    const newStatus =
      p.id === proposalId ? PROPOSAL_STATUS.ACCEPTED : PROPOSAL_STATUS.REJECTED;
    await updateDocById(COL_PROPOSALS, p.id, { status: newStatus });
  }

  // Mark the job hired
  await updateDocById(COL_JOBS, job.id, {
    status: JOB_STATUS.HIRED,
    hiredProviderId: proposal.providerId,
  });

  return { ok: true };
}

export async function rejectProposal(proposalId) {
  const proposal = await getDocById(COL_PROPOSALS, proposalId);
  if (!proposal) return { ok: false, error: "Proposal not found." };
  return await updateDocById(COL_PROPOSALS, proposalId, {
    status: PROPOSAL_STATUS.REJECTED,
  });
}