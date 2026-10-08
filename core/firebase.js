// ============================================================
// ZEDCLEANER — core/firebase.js
// Initializes Firebase and exports the services we use.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFo8Qbnl4BuB8ZLTjJ-eH79sbvu8TFQwk",
  authDomain: "zedcleaner-c91f4.firebaseapp.com",
  projectId: "zedcleaner-c91f4",
  storageBucket: "zedcleaner-c91f4.firebasestorage.app",
  messagingSenderId: "901240876440",
  appId: "1:901240876440:web:15e53f5f4d16a62a990fed"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
