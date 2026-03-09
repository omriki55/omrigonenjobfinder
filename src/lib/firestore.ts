import { db } from "./firebase";
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs,
  onSnapshot, type Unsubscribe
} from "firebase/firestore";

// Read a single data key for a family
export async function getFamilyData<T = any>(familyId: string, key: string): Promise<T | null> {
  try {
    const docRef = doc(db, `families/${familyId}/data`, key);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const raw = snap.data().value;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error(`getFamilyData(${familyId}, ${key}):`, e);
    return null;
  }
}

// Load ALL data keys for a family
export async function getAllFamilyData(familyId: string): Promise<Record<string, any>> {
  try {
    const colRef = collection(db, `families/${familyId}/data`);
    const snapshot = await getDocs(colRef);
    const data: Record<string, any> = {};
    snapshot.forEach((d) => {
      try {
        const raw = d.data().value;
        data[d.id] = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        data[d.id] = d.data().value;
      }
    });
    return data;
  } catch (e) {
    console.error(`getAllFamilyData(${familyId}):`, e);
    return {};
  }
}

// Real-time listener
export function onFamilyDataChange(
  familyId: string,
  key: string,
  callback: (data: any) => void
): Unsubscribe {
  const docRef = doc(db, `families/${familyId}/data`, key);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      try {
        const raw = snap.data().value;
        callback(typeof raw === "string" ? JSON.parse(raw) : raw);
      } catch {}
    }
  });
}

// Admin config
export async function getAdminConfig(): Promise<{ adminEmails: string[] } | null> {
  try {
    const docRef = doc(db, "admin", "config");
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as { adminEmails: string[] }) : null;
  } catch {
    return null;
  }
}

export async function setAdminConfig(config: { adminEmails: string[] }) {
  await setDoc(doc(db, "admin", "config"), config);
}

// Family registry
export async function getFamilyRegistry(): Promise<Array<{ familyId: string; [key: string]: any }>> {
  try {
    const colRef = collection(db, "admin/registry/families");
    const snapshot = await getDocs(colRef);
    const families: Array<{ familyId: string; [key: string]: any }> = [];
    snapshot.forEach((d) => families.push({ familyId: d.id, ...d.data() }));
    return families;
  } catch {
    return [];
  }
}

export async function registerFamily(familyId: string, metadata: Record<string, any>) {
  await setDoc(doc(db, "admin/registry/families", familyId), {
    familyId,
    registeredAt: new Date().toISOString(),
    ...metadata,
  });
}

export async function removeFamily(familyId: string) {
  await deleteDoc(doc(db, "admin/registry/families", familyId));
}

// Write a data key for a family (admin edit)
export async function setFamilyData(familyId: string, key: string, value: any) {
  const docRef = doc(db, `families/${familyId}/data`, key);
  await setDoc(docRef, {
    value: JSON.stringify(value),
    updatedAt: new Date().toISOString(),
  });
}

// ── Legacy / Discovery helpers ──

// Discover families from the legacy "family-chores" collection
export async function discoverFromLegacy(): Promise<{ familyId: string | null; familyName: string; hasLegacyData: boolean }> {
  try {
    const docRef = doc(db, "family-chores", "family-config");
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { familyId: null, familyName: "", hasLegacyData: false };

    const raw = snap.data().value;
    let config: any;
    try {
      config = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      config = raw;
    }

    return {
      familyId: config?.familyId || null,
      familyName: config?.familyName || "",
      hasLegacyData: true,
    };
  } catch {
    return { familyId: null, familyName: "", hasLegacyData: false };
  }
}

// Load all data from the legacy "family-chores" collection
export async function getLegacyFamilyData(): Promise<Record<string, any>> {
  try {
    const colRef = collection(db, "family-chores");
    const snapshot = await getDocs(colRef);
    const data: Record<string, any> = {};
    snapshot.forEach((d) => {
      try {
        const raw = d.data().value;
        data[d.id] = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        data[d.id] = d.data().value;
      }
    });
    return data;
  } catch (e) {
    console.error("getLegacyFamilyData:", e);
    return {};
  }
}
