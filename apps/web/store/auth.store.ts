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
  _restoring: boolean;
  _bootstrapped: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setRestoring: (restoring: boolean) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      _hydrated: false,
      _restoring: false,
      _bootstrapped: false,
      setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken, _hydrated: true, _bootstrapped: true, _restoring: false });
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, _bootstrapped: true, _restoring: false });
      },
      setRestoring: (_restoring) => set({ _restoring }),
      setBootstrapped: (_bootstrapped) => set({ _bootstrapped }),
    }),
    {
      name: 'primaria-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.error('Auth hydration failed:', error);
          }
          useAuthStore.setState({ _hydrated: true });
        };
      },
    },
  ),
);
