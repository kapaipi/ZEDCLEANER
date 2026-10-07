// ============================================================
// ZEDCLEANER — core/storage.js
// All Firestore read/write operations live here.
// Everything else in the app goes through these functions.
// ============================================================

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";

/**
 * Add a new document to a collection with an auto-generated ID.
 * Returns the full object including its new `id`.
 */
export async function addDocTo(collectionName, data) {
  try {
    const ref = await addDoc(collection(db, collectionName), data);
    return { ok: true, data: { id: ref.id, ...data } };
  } catch (error) {
    console.error(`[storage] addDocTo("${collectionName}") failed:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get ALL documents in a collection.
 * Returns an array of { id, ...fields }.
 */
export async function getAllDocs(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`[storage] getAllDocs("${collectionName}") failed:`, error);
    return [];
  }
}

/**
 * Get one document by ID. Returns the object or null.
 */
export async function getDocById(collectionName, id) {
  try {
    const ref = doc(db, collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[storage] getDocById("${collectionName}", "${id}") failed:`, error);
    return null;
  }
}

/**
 * Update specific fields on a document.
 * Returns { ok: true } on success.
 */
export async function updateDocById(collectionName, id, updates) {
  try {
    const ref = doc(db, collectionName, id);
    await updateDoc(ref, updates);
    return { ok: true };
  } catch (error) {
    console.error(`[storage] updateDocById("${collectionName}", "${id}") failed:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Delete a document by ID.
 */
export async function deleteDocById(collectionName, id) {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { ok: true };
  } catch (error) {
    console.error(`[storage] deleteDocById("${collectionName}", "${id}") failed:`, error);
    return { ok: false, error: error.message };
  }
}