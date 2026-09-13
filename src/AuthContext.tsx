import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth, ensureFirebaseAuth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './typesAndData';

interface AuthContextType {
  currentUser: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

const LOCAL_STORAGE_KEY = 'shiroko_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session on mount
    const initSession = async () => {
      try {
        await ensureFirebaseAuth();
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as UserProfile;
          // Verify with Firestore
          const userDoc = await getDoc(doc(db, 'users', parsed.userId));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as UserProfile);
          } else {
            setCurrentUser(parsed);
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();
  }, []);

  const login = async (username: string, passwordHash: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        return { success: false, error: 'Username minimal 3 karakter.' };
      }
      if (!passwordHash || passwordHash.length < 4) {
        return { success: false, error: 'Password minimal 4 karakter.' };
      }

      const fbUser = await ensureFirebaseAuth();
      // Stable sanitized ID based on username for quick simulated lookup
      const userId = fbUser?.uid || `usr_${cleanUsername.replace(/[^a-z0-9]/g, '_')}`;
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      let profile: UserProfile;

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.password && data.password !== passwordHash) {
          return { success: false, error: 'Password salah untuk username ini.' };
        }
        profile = {
          userId: data.userId || userId,
          username: data.username || cleanUsername,
          displayName: data.displayName || username,
          avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
          createdAt: data.createdAt || Date.now(),
        };
      } else {
        // Create new simulated account
        profile = {
          userId,
          username: cleanUsername,
          displayName: username,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
          createdAt: Date.now(),
        };
        await setDoc(userRef, {
          ...profile,
          password: passwordHash, // stored simply for simulated mock verification
        });
      }

      setCurrentUser(profile);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
      return { success: true };
    } catch (e: any) {
      console.error('Login error:', e);
      return { success: false, error: e.message || 'Gagal masuk. Silakan coba lagi.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn: !!currentUser,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
