import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Auth,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';
import {
  ArchivedQuarterm,
  ChecklistItem,
  DefenseAppointment,
  DefenseSlot,
  FacultyChair,
  QuartermPeriod,
  StudentFileSubmission,
  UserAccount,
  ZoomRoom,
} from '../types/defense';

const CONFIG_STORAGE_KEY = 'thesisdesk_firebase_config';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCkZSiWHLb8qrzUAiocgrijAaQ5dujYJWo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mapua-schedpoint.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mapua-schedpoint",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mapua-schedpoint.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "670467479029",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:670467479029:web:5a91bb3e3cd85ca51bbcbc"
};

export function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading Firebase config from localStorage:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: typeof DEFAULT_FIREBASE_CONFIG | null) {
  try {
    if (!config) {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving Firebase config:', e);
  }
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) return null;

  try {
    if (getApps().length === 0) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }
    return appInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase App:', err);
    return null;
  }
}

export function getDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('Failed to get Firestore:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    authInstance = getAuth(app);
    return authInstance;
  } catch (err) {
    console.error('Failed to get Firebase Auth:', err);
    return null;
  }
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (storageInstance) return storageInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    storageInstance = getStorage(app);
    return storageInstance;
  } catch (err) {
    console.error('Failed to get Firebase Storage:', err);
    return null;
  }
}

// --------------------------------------------------------------------------
// Real-Time Database Subscriptions
// --------------------------------------------------------------------------

export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
        })) as T[];
        onUpdate(records);
      },
      (error) => {
        console.warn(`Firestore onSnapshot warning on ${collectionName}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error(`Failed to subscribe to collection ${collectionName}:`, err);
    return null;
  }
}

export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  onUpdate: (data: T | null) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  try {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as T);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn(`Firestore onSnapshot warning on ${collectionName}/${docId}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error(`Failed to subscribe to doc ${collectionName}/${docId}:`, err);
    return null;
  }
}

// --------------------------------------------------------------------------
// Direct Document Persistence Operations
// --------------------------------------------------------------------------

export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  data: T
): Promise<boolean> {
  const db = getDb();
  if (!db || !data.id) return false;
  try {
    const docRef = doc(db, collectionName, data.id);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err) {
    console.error(`Error saving document to ${collectionName}/${data.id}:`, err);
    return false;
  }
}

export async function removeDocument(
  collectionName: string,
  id: string
): Promise<boolean> {
  const db = getDb();
  if (!db || !id) return false;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting document from ${collectionName}/${id}:`, err);
    return false;
  }
}

export async function saveActiveQuarter(quarter: QuartermPeriod | null): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const docRef = doc(db, 'settings', 'active_quarterm');
    await setDoc(docRef, { quarter: quarter || null });
    return true;
  } catch (err) {
    console.error('Error saving active quarterm:', err);
    return false;
  }
}

export async function batchSaveDocuments<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<boolean> {
  const db = getDb();
  if (!db || items.length === 0) return false;
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      if (item.id) {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item, { merge: true });
      }
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.error(`Error in batch saving to ${collectionName}:`, err);
    return false;
  }
}

// --------------------------------------------------------------------------
// Real File Upload to Firebase Storage (with IndexedDB fallback)
// --------------------------------------------------------------------------

const IDB_NAME = 'ThesisDesk_FileStore';
const IDB_STORE = 'files';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeFileInIdb(fileKey: string, fileBlob: Blob): Promise<string> {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(fileBlob, fileKey);
      tx.oncomplete = () => {
        const url = URL.createObjectURL(fileBlob);
        resolve(url);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB write failed, falling back to blob URL:', e);
    return URL.createObjectURL(fileBlob);
  }
}

export async function retrieveFileFromIdb(fileKey: string): Promise<string | null> {
  try {
    const db = await openIdb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(fileKey);
      req.onsuccess = () => {
        if (req.result instanceof Blob) {
          resolve(URL.createObjectURL(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function uploadSubmissionFile(
  submissionId: string,
  file: File
): Promise<{ downloadUrl: string; isCloud: boolean }> {
  const storage = getFirebaseStorage();
  
  // Try uploading to real Firebase Storage first
  if (storage) {
    try {
      const extension = file.name.split('.').pop() || 'pdf';
      const cleanName = `${submissionId}_${Date.now()}.${extension}`;
      const pathRef = storageRef(storage, `thesis_submissions/${cleanName}`);
      
      const snapshot = await uploadBytes(pathRef, file, {
        contentType: file.type || 'application/pdf',
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return { downloadUrl, isCloud: true };
    } catch (err) {
      console.warn('Firebase Storage upload failed, falling back to local persistent storage:', err);
    }
  }

  // Fallback to IndexedDB persistent storage
  const localUrl = await storeFileInIdb(submissionId, file);
  return { downloadUrl: localUrl, isCloud: false };
}

// --------------------------------------------------------------------------
// Real User Management & Persistent Profiles
// --------------------------------------------------------------------------

export async function fetchUserByEmail(email: string): Promise<UserAccount | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    for (const docSnap of snapshot.docs) {
      const user = docSnap.data() as UserAccount;
      if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  } catch (err) {
    console.error('Error fetching user by email:', err);
    return null;
  }
}

export async function registerOrUpdateUser(user: UserAccount): Promise<boolean> {
  return saveDocument('users', user);
}
