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
  refreshToken: string | null;
  _hydrated: boolean;
  _restoring: boolean;
  _bootstrapped: boolean;
  setAuth: (user: AuthUser, token: string, refreshToken?: string | null) => void;
  clearAuth: () => void;
  setRestoring: (restoring: boolean) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      _hydrated: false,
      _restoring: false,
      _bootstrapped: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        set({
          user,
          accessToken,
          refreshToken: refreshToken ?? localStorage.getItem('refreshToken'),
          _hydrated: true,
          _bootstrapped: true,
          _restoring: false,
        });
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, _bootstrapped: true, _restoring: false });
      },
      setRestoring: (_restoring) => set({ _restoring }),
      setBootstrapped: (_bootstrapped) => set({ _bootstrapped }),
    }),
    {
      name: 'primaria-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
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
