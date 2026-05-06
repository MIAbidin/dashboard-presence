// src/stores/authStore.ts
// Update Fase E: tambah role 'super_admin', validasi login super_admin diizinkan

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────
export interface AdminUser {
  id: string
  nim_nidn: string
  nama_lengkap: string
  email: string
  role: 'admin' | 'super_admin'   // ← Fase E: tambah super_admin
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

          // Fase E: izinkan 'admin' dan 'super_admin'
          if (user.role !== 'admin' && user.role !== 'super_admin') {
            throw new Error(
              'Akun ini tidak memiliki akses dashboard. ' +
              'Hubungi Super Admin (IT Kampus).'
            )
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
        const token = get().accessToken
        if (token) {
          api.post('/auth/logout').catch(() => {})
        }

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
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

// ── Selector helpers ──────────────────────────────────────────
export const selectUser         = (state: AuthState) => state.user
export const selectIsLoggedIn   = (state: AuthState) => !!state.user && !!state.accessToken
export const selectIsSuperAdmin = (state: AuthState) => state.user?.role === 'super_admin'