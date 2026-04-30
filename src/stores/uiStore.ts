import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  isSidebarCollapsed: boolean
  isDarkMode: boolean

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isDarkMode: false,

      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),

      toggleDarkMode: () =>
        set((state) => {
          const next = !state.isDarkMode
          // Apply ke <html> element langsung
          document.documentElement.classList.toggle('dark', next)
          return { isDarkMode: next }
        }),
      setDarkMode: (dark) => {
        document.documentElement.classList.toggle('dark', dark)
        set({ isDarkMode: dark })
      },
    }),
    {
      name: 'admin-ui-storage',
      onRehydrateStorage: () => (state) => {
        // Re-apply dark mode class saat app pertama kali load
        if (state?.isDarkMode) {
          document.documentElement.classList.add('dark')
        }
      },
    }
  )
)