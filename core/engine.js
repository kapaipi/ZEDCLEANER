// ============================================================
// ZEDCLEANER — core/engine.js
// Business logic: users, jobs, proposals.
// Every user can post jobs AND send proposals.
// ============================================================

import { saveData, loadData } from "./storage.js";

const KEY_USERS     = "zedcleaner_users";
const KEY_JOBS      = "zedcleaner_jobs";
const KEY_PROPOSALS = "zedcleaner_proposals";

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

// Only two roles now: regular user, and admin.
export const ROLES = {
  USER:  "user",
  ADMIN: "admin",
};

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readUsers()  { return loadData(KEY_USERS, []); }
function writeUsers(u){ saveData(KEY_USERS, u); }

function readJobs()   { return loadData(KEY_JOBS, []); }
function writeJobs(j) { saveData(KEY_JOBS, j); }

function readProposals()  { return loadData(KEY_PROPOSALS, []); }
function writeProposals(p){ saveData(KEY_PROPOSALS, p); }

// ---------- Bootstrap: create admin if missing ----------
export function bootstrap() {
  const users = readUsers();
  const adminExists = users.some((u) => u.role === ROLES.ADMIN);
  if (!adminExists) {
    const admin = {
      id: generateId("user"),
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
    };
    users.push(admin);
    writeUsers(users);
    console.log("[engine] Admin created: admin@zedcleaner.com / admin123");
  }
}

// ---------- USERS ----------
export function createUser({ name, email, password, phone = "", location = "", skills = [], experience = "", bio = "" }) {
  if (!name || !email || !password) {
    return { ok: false, error: "Missing required fields." };
  }
  const users = readUsers();
  const emailLower = email.trim().toLowerCase();
  if (users.some((u) => u.email === emailLower)) {
    return { ok: false, error: "An account with that email already exists." };
  }
  const user = {
    id: generateId("user"),
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
  };
  users.push(user);
  writeUsers(users);
  return { ok: true, user };
}

export function loginUser(email, password) {
  const users = readUsers();
  const emailLower = String(email || "").trim().toLowerCase();
  const user = users.find((u) => u.email === emailLower && u.password === password);
  if (!user) return { ok: false, error: "Invalid email or password." };
  return { ok: true, user };
}

export function findUserById(id) {
  return readUsers().find((u) => u.id === id) || null;
}

export function getAllUsers() {
  return readUsers();
}

export function updateUser(id, updates) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return { ok: false, error: "User not found." };
  delete updates.id;
  delete updates.role;
  users[idx] = { ...users[idx], ...updates };
  writeUsers(users);
  return { ok: true, user: users[idx] };
}

// ---------- JOBS ----------
export function createJob({ customerId, title, category, description, location, budget }) {
  if (!customerId || !title || !category || !description) {
    return { ok: false, error: "Missing required job fields." };
  }
  if (!CATEGORIES.includes(category)) {
    return { ok: false, error: "Invalid category." };
  }
  const jobs = readJobs();
  const job = {
    id: generateId("job"),
    customerId,
    title: title.trim(),
    category,
    description: description.trim(),
    location: (location || "").trim(),
    budget: budget || "",
    status: JOB_STATUS.OPEN,
    hiredProviderId: null,
    createdAt: new Date().toISOString(),
  };
  jobs.push(job);
  writeJobs(jobs);
  return { ok: true, job };
}

export function getAllJobs() { return readJobs(); }

export function getOpenJobs() {
  return readJobs().filter((j) => j.status === JOB_STATUS.OPEN);
}

export function getJobsByCustomer(customerId) {
  return readJobs().filter((j) => j.customerId === customerId);
}

export function findJobById(id) {
  return readJobs().find((j) => j.id === id) || null;
}

export function getJobsByHiredProvider(providerId) {
  return readJobs().filter((j) => j.hiredProviderId === providerId);
}

// ---------- PROPOSALS ----------
export function submitProposal({ jobId, providerId, price, message }) {
  if (!jobId || !providerId || !price) {
    return { ok: false, error: "Missing required proposal fields." };
  }
  const job = findJobById(jobId);
  if (!job) return { ok: false, error: "Job not found." };
  if (job.status !== JOB_STATUS.OPEN) {
    return { ok: false, error: "This job is no longer open." };
  }
  if (job.customerId === providerId) {
    return { ok: false, error: "You cannot propose on your own job." };
  }

  const proposals = readProposals();
  if (proposals.some((p) => p.jobId === jobId && p.providerId === providerId)) {
    return { ok: false, error: "You have already proposed on this job." };
  }

  const proposal = {
    id: generateId("prop"),
    jobId,
    providerId,
    price,
    message: (message || "").trim(),
    status: PROPOSAL_STATUS.PENDING,
    createdAt: new Date().toISOString(),
  };
  proposals.push(proposal);
  writeProposals(proposals);
  return { ok: true, proposal };
}

export function getProposalsByJob(jobId) {
  return readProposals().filter((p) => p.jobId === jobId);
}

export function getProposalsByProvider(providerId) {
  return readProposals().filter((p) => p.providerId === providerId);
}

export function getAllProposals() { return readProposals(); }

export function acceptProposal(proposalId) {
  const proposals = readProposals();
  const target = proposals.find((p) => p.id === proposalId);
  if (!target) return { ok: false, error: "Proposal not found." };

  const jobs = readJobs();
  const jobIdx = jobs.findIndex((j) => j.id === target.jobId);
  if (jobIdx === -1) return { ok: false, error: "Job not found." };
  if (jobs[jobIdx].status !== JOB_STATUS.OPEN) {
    return { ok: false, error: "Job is no longer open." };
  }

  const updated = proposals.map((p) => {
    if (p.jobId !== target.jobId) return p;
    if (p.id === proposalId) return { ...p, status: PROPOSAL_STATUS.ACCEPTED };
    return { ...p, status: PROPOSAL_STATUS.REJECTED };
  });

  jobs[jobIdx] = {
    ...jobs[jobIdx],
    status: JOB_STATUS.HIRED,
    hiredProviderId: target.providerId,
  };

  writeProposals(updated);
  writeJobs(jobs);
  return { ok: true };
}

export function rejectProposal(proposalId) {
  const proposals = readProposals();
  const idx = proposals.findIndex((p) => p.id === proposalId);
  if (idx === -1) return { ok: false, error: "Proposal not found." };
  proposals[idx] = { ...proposals[idx], status: PROPOSAL_STATUS.REJECTED };
  writeProposals(proposals);
  return { ok: true };
}