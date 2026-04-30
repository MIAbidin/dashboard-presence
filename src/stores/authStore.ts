import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────
export interface AdminUser {
  id: string
  nim_nidn: string
  nama_lengkap: string
  email: string
  role: 'admin'
  program_studi: string
  is_face_registered: boolean
}

interface AuthState {
  user: AdminUser | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (nimNidn: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
  setUser: (user: AdminUser) => void
}

// ── Store ─────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // ── Login ───────────────────────────────────────────────
      login: async (nimNidn: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', {
            nim_nidn: nimNidn,
            password,
          })

          const { access_token, refresh_token, user } = response.data

          // Validasi — hanya admin yang bisa masuk ke dashboard ini
          if (user.role !== 'admin') {
            throw new Error('Akun ini tidak memiliki akses admin. Hubungi administrator kampus.')
          }

          // Simpan token ke localStorage (untuk axios interceptor)
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)

          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isLoading: false,
            error: null,
          })
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { detail?: string } }; message?: string })
              .response?.data?.detail ??
            (err as { message?: string }).message ??
            'Login gagal. Coba lagi.'

          set({ isLoading: false, error: message, user: null })
          throw new Error(message)
        }
      },

      // ── Logout ──────────────────────────────────────────────
      logout: () => {
        // Panggil endpoint logout (fire and forget — tidak perlu tunggu)
        const token = get().accessToken
        if (token) {
          api.post('/auth/logout').catch(() => {
            // Ignore error saat logout
          })
        }

        // Bersihkan semua state dan storage
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        })
      },

      // ── Helpers ─────────────────────────────────────────────
      clearError: () => set({ error: null }),
      setUser: (user: AdminUser) => set({ user }),
    }),
    {
      name: 'admin-auth-storage',
      // Hanya persist data user — token disimpan di localStorage terpisah
      // agar axios interceptor bisa akses tanpa import store
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

// ── Selector helpers (untuk komponen) ─────────────────────────
export const selectUser = (state: AuthState) => state.user
export const selectIsLoggedIn = (state: AuthState) => !!state.user && !!state.accessToken