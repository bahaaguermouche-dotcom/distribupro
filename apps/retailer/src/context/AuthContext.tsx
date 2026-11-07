import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface RetailerUser {
  id: string;
  code?: string;
  name?: string;
  sector: string;
  phoneOrEmail: string;
  isFirstLogin: boolean;
  status: 'active' | 'pending' | 'suspended';
  address?: string;
  rcNumber?: string;
  phone?: string;
  phones?: string[];
  lat?: number;
  lng?: number;
  walletBalance?: number;
}

interface AuthContextType {
  user: RetailerUser | null;
  loading: boolean;
  login: (phoneOrEmail: string, pass: string) => Promise<{ success: boolean; isFirstLogin?: boolean; error?: string }>;
  completeFirstLogin: (data: { storeName: string; rcNumber: string; address: string; phone: string; newPassword: string; lat?: number; lng?: number }) => Promise<boolean>;
  updateProfile: (data: Partial<RetailerUser> & { newPassword?: string }) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RetailerUser | null>(() => {
    const cached = localStorage.getItem('distribupro_retailer_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('distribupro_retailer_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('distribupro_retailer_user');
    }
  }, [user]);

  const login = async (phoneOrEmail: string, pass: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'retailers'),
        where('phoneOrEmail', '==', phoneOrEmail.trim())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'Identifiant non reconnu ou compte magasin inexistant.' };
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data() as RetailerUser & { tempPassword?: string; password?: string };

      if (data.status === 'suspended') {
        return { success: false, error: 'Ce compte boutique a été suspendu par l\'administrateur.' };
      }

      const validPass = data.isFirstLogin
        ? data.tempPassword === pass
        : (data.password === pass || data.tempPassword === pass);

      if (!validPass) {
        return { success: false, error: 'Mot de passe incorrect.' };
      }

      const retUser: RetailerUser = {
        id: docSnap.id,
        code: data.code,
        name: data.name,
        sector: data.sector,
        phoneOrEmail: data.phoneOrEmail,
        isFirstLogin: data.isFirstLogin ?? false,
        status: data.status,
        address: data.address,
        rcNumber: data.rcNumber,
        phone: data.phone,
        walletBalance: data.walletBalance || 0,
      };

      setUser(retUser);
      return { success: true, isFirstLogin: retUser.isFirstLogin };
    } catch (err: any) {
      console.error('Retailer login error:', err);
      return { success: false, error: 'Erreur lors de la connexion. Vérifiez vos identifiants.' };
    } finally {
      setLoading(false);
    }
  };

  const completeFirstLogin = async (data: { storeName: string; rcNumber: string; address: string; phone: string; newPassword: string; lat?: number; lng?: number }) => {
    if (!user) return false;
    try {
      await updateDoc(doc(db, 'retailers', user.id), {
        name: data.storeName,
        rcNumber: data.rcNumber,
        address: data.address,
        phone: data.phone,
        password: data.newPassword,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        isFirstLogin: false,
      });

      setUser(prev => prev ? {
        ...prev,
        name: data.storeName,
        rcNumber: data.rcNumber,
        address: data.address,
        phone: data.phone,
        lat: data.lat,
        lng: data.lng,
        isFirstLogin: false,
      } : null);

      return true;
    } catch (err) {
      console.error('Error completing retailer onboarding:', err);
      return false;
    }
  };

  const updateProfile = async (data: Partial<RetailerUser> & { newPassword?: string }) => {
    if (!user) return false;
    try {
      const updateData: any = { ...data };
      if (data.newPassword) {
        updateData.password = data.newPassword;
        delete updateData.newPassword;
      }

      await updateDoc(doc(db, 'retailers', user.id), updateData);

      setUser(prev => prev ? {
        ...prev,
        ...data,
      } : null);

      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, completeFirstLogin, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
