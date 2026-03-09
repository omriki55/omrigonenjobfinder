import { useState, useEffect } from "react";
import { type User, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAdminConfig, setAdminConfig } from "@/lib/firestore";

const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setChecking(true);
        try {
          const config = await getAdminConfig();
          if (config && config.adminEmails?.includes(u.email || "")) {
            setIsAdmin(true);
          } else if (!config) {
            // First-time bootstrap: create admin config with current user
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || u.email;
            await setAdminConfig({ adminEmails: [adminEmail] });
            if (u.email === adminEmail) setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (e) {
          console.error("Admin check failed:", e);
          // Fallback: check env variable
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
          if (adminEmail && u.email === adminEmail) setIsAdmin(true);
        }
        setChecking(false);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Sign-in error:", e);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setIsAdmin(false);
  };

  return { user, isAdmin, loading: loading || checking, signIn, signOut };
}
