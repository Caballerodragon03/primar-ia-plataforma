import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  role: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN';
  estado: string;
  nombre: string;
  apellidos: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  _hydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hydrated: false,
      setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken, isAuthenticated: true, _hydrated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'primaria-auth',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        useAuthStore.setState({
          _hydrated: true,
          isAuthenticated: state?.user != null,
        });
      },
    }
  )
);
