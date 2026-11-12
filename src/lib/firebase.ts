import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query
} from 'firebase/firestore';
import { Activo } from '../types';
import config from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp({
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
});

// Initialize Firestore with custom databaseId if configured
export const db = config.firestoreDatabaseId
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

const COLLECTION_NAME = 'activos';

/**
 * Real-time subscription to activos collection in Firebase Firestore
 */
export function subscribeToActivos(
  onData: (activos: Activo[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Activo[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Activo;
          list.push({
            ...data,
            id: docSnap.id,
          });
        });
        onData(list);
      },
      (error) => {
        console.error('Error in Firestore onSnapshot:', error);
        onError?.(error);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.error('Failed to subscribe to Firestore:', err);
    onError?.(err);
    return () => {};
  }
}

/**
 * Save or update single Activo in Firestore
 */
export async function saveActivoToFirebase(activo: Activo): Promise<void> {
  const docId = String(activo.codigo || activo.id).replace(/\//g, '_').trim();
  const docRef = doc(db, COLLECTION_NAME, docId);
  const dataToSave = {
    ...activo,
    id: docId,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

/**
 * Delete single Activo from Firestore
 */
export async function deleteActivoFromFirebase(activoId: string | number): Promise<void> {
  const docId = String(activoId).replace(/\//g, '_').trim();
  const docRef = doc(db, COLLECTION_NAME, docId);
  await deleteDoc(docRef);
}

/**
 * Batch upload activos to Firebase Firestore (respecting 500 operations per batch)
 */
export async function bulkUploadActivosToFirebase(
  activos: Activo[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const CHUNK_SIZE = 400;
    let processed = 0;

    for (let i = 0; i < activos.length; i += CHUNK_SIZE) {
      const chunk = activos.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((activo, idx) => {
        const rawId = activo.codigo ? String(activo.codigo) : `activo_${i + idx}`;
        const docId = rawId.replace(/\//g, '_').trim();
        const docRef = doc(db, COLLECTION_NAME, docId);
        batch.set(docRef, {
          ...activo,
          id: docId,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      await batch.commit();
      processed += chunk.length;
      onProgress?.(processed, activos.length);
    }

    return { success: true, count: processed };
  } catch (err: any) {
    console.error('Error in bulkUploadActivosToFirebase:', err);
    return { success: false, count: 0, error: err?.message || 'Error al guardar en Firebase' };
  }
}

/**
 * Delete all assets from Firestore (used when replacing entire database)
 */
export async function clearAllActivosInFirebase(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const CHUNK_SIZE = 400;
    const docs = snap.docs;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (e) {
    console.error('Error clearing Firestore collection:', e);
    throw e;
  }
}
