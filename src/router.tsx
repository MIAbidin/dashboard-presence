import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// ── Lazy-load semua halaman (code splitting otomatis) ─────────
const LoginPage           = lazy(() => import('@/pages/Login'))
const DashboardPage       = lazy(() => import('@/pages/Dashboard'))
const MahasiswaPage       = lazy(() => import('@/pages/Mahasiswa'))
const DosenPage           = lazy(() => import('@/pages/Dosen'))
const MatakuliahPage      = lazy(() => import('@/pages/Matakuliah'))
const EnrollmentPage      = lazy(() => import('@/pages/Enrollment'))
const LaporanPage         = lazy(() => import('@/pages/Laporan'))
const JadwalPenggantiPage = lazy(() => import('@/pages/JadwalPengganti'))
const ImportPage          = lazy(() => import('@/pages/ImportData'))
const ProfilPage          = lazy(() => import('@/pages/Profil'))
const AuditPage           = lazy(() => import('@/pages/AuditLog'))
const SchedulerPage       = lazy(() => import('@/pages/Scheduler'))
const RuanganPage         = lazy(() => import('@/pages/Ruangan'))  // ← Fase A

// ── Layout utama (Sidebar + Topbar) ──────────────────────────
const AppLayout = lazy(() => import('@/components/Layout/AppLayout'))

// ── Loading fallback ──────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Memuat halaman...</p>
      </div>
    </div>
  )
}

// ── Auth guard — redirect ke login jika belum login ───────────
function PrivateRoute() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!user || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

// ── Public guard — redirect ke dashboard jika sudah login ─────
function PublicOnlyRoute() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (user && accessToken) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

// ── Router definition ─────────────────────────────────────────
export const router = createBrowserRouter([
  // Public routes (login)
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicOnlyRoute />
      </Suspense>
    ),
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },

  // Protected routes (perlu login sebagai admin)
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <PrivateRoute />
      </Suspense>
    ),
    children: [
      {
        element: (
          <Suspense fallback={<PageLoader />}>
            <AppLayout />
          </Suspense>
        ),
        children: [
          {
            path: '/dashboard',
            element: (
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: '/audit',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AuditPage />
              </Suspense>
            ),
          },
          {
            path: '/scheduler',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SchedulerPage />
              </Suspense>
            ),
          },
          {
            path: '/mahasiswa',
            element: (
              <Suspense fallback={<PageLoader />}>
                <MahasiswaPage />
              </Suspense>
            ),
          },
          {
            path: '/dosen',
            element: (
              <Suspense fallback={<PageLoader />}>
                <DosenPage />
              </Suspense>
            ),
          },
          {
            path: '/matakuliah',
            element: (
              <Suspense fallback={<PageLoader />}>
                <MatakuliahPage />
              </Suspense>
            ),
          },
          {
            path: '/ruangan',  // ← Fase A
            element: (
              <Suspense fallback={<PageLoader />}>
                <RuanganPage />
              </Suspense>
            ),
          },
          {
            path: '/enrollment',
            element: (
              <Suspense fallback={<PageLoader />}>
                <EnrollmentPage />
              </Suspense>
            ),
          },
          {
            path: '/laporan',
            element: (
              <Suspense fallback={<PageLoader />}>
                <LaporanPage />
              </Suspense>
            ),
          },
          { 
            path: '/jadwal-pengganti', 
            element: (
              <Suspense fallback={<PageLoader />}>
                <JadwalPenggantiPage />
              </Suspense>
            ),
          },
          {
            path: '/import',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ImportPage />
              </Suspense>
            ),
          },
          {
            path: '/profil',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProfilPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  // Catch-all — redirect ke dashboard atau login
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold text-foreground">404</h1>
        <p className="text-muted-foreground">Halaman tidak ditemukan</p>
        <a href="/dashboard" className="text-primary underline underline-offset-4">
          Kembali ke Dashboard
        </a>
      </div>
    ),
  },
])