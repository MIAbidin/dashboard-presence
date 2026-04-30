import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { router } from '@/router'
import '@/index.css'

// ── React Query client ────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data dianggap stale setelah 5 menit → akan refetch saat window refocus
      staleTime: 5 * 60 * 1000,
      // Retry 1x jika request gagal (bukan error 4xx)
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        // Jangan retry untuk error auth atau not found
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 1
      },
    },
    mutations: {
      // Tidak retry untuk mutations
      retry: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />

      {/* Toast notifikasi — akan digunakan di seluruh aplikasi */}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            fontSize: '14px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          },
          success: {
            iconTheme: {
              primary: 'hsl(142, 76%, 36%)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'white',
            },
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
)