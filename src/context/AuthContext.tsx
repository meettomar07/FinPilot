import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { setAuthTokenProvider } from "../app/api";
import { firebaseAuth, firebaseConfigError, googleAuthProvider } from "../lib/firebase";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function ensureFirebaseAuth() {
  if (!firebaseAuth) {
    throw new Error(firebaseConfigError ?? "Firebase Authentication is not configured.");
  }
  return firebaseAuth;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    setAuthTokenProvider(async () => (user ? user.getIdToken() : null));
    return () => setAuthTokenProvider(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signInGoogle() {
        const auth = ensureFirebaseAuth();
        if (!googleAuthProvider) {
          throw new Error("Google sign-in is not configured.");
        }
        await signInWithPopup(auth, googleAuthProvider);
      },
      async signInEmail(email: string, password: string) {
        await signInWithEmailAndPassword(ensureFirebaseAuth(), email, password);
      },
      async signUp(email: string, password: string, displayName?: string) {
        const credentials = await createUserWithEmailAndPassword(ensureFirebaseAuth(), email, password);
        if (displayName?.trim()) {
          await updateProfile(credentials.user, { displayName: displayName.trim() });
          setUser({ ...credentials.user, displayName: displayName.trim() });
        }
      },
      async logout() {
        await signOut(ensureFirebaseAuth());
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
