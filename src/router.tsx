// src/router.tsx
// Update Fase E: tambah route /super-admin/admins dan /super-admin/konfigurasi

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// ── Lazy-load semua halaman (code splitting otomatis) ─────────
const LoginPage              = lazy(() => import('@/pages/Login'))
const DashboardPage          = lazy(() => import('@/pages/Dashboard'))
const MahasiswaPage          = lazy(() => import('@/pages/Mahasiswa'))
const DosenPage              = lazy(() => import('@/pages/Dosen'))
const MatakuliahPage         = lazy(() => import('@/pages/Matakuliah'))
const EnrollmentPage         = lazy(() => import('@/pages/Enrollment'))
const LaporanPage            = lazy(() => import('@/pages/Laporan'))
const JadwalPenggantiPage    = lazy(() => import('@/pages/JadwalPengganti'))
const ImportPage             = lazy(() => import('@/pages/ImportData'))
const ProfilPage             = lazy(() => import('@/pages/Profil'))
const AuditPage              = lazy(() => import('@/pages/AuditLog'))
const SchedulerPage          = lazy(() => import('@/pages/Scheduler'))
const RuanganPage            = lazy(() => import('@/pages/Ruangan'))
const ProgramStudiPage       = lazy(() => import('@/pages/ProgramStudi'))
// Fase E — Super Admin pages
const AdminManagementPage    = lazy(() => import('@/pages/SuperAdmin/AdminManagement'))
const KonfigurasiPage        = lazy(() => import('@/pages/SuperAdmin/Konfigurasi'))

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

// ── Auth guard ────────────────────────────────────────────────
function PrivateRoute() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!user || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}

// ── Super Admin guard ─────────────────────────────────────────
function SuperAdminRoute() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

// ── Public guard ──────────────────────────────────────────────
function PublicOnlyRoute() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (user && accessToken) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

// ── Helper wrapper ────────────────────────────────────────────
function Lazy({ component: C }: { component: React.LazyExoticComponent<React.ComponentType> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <C />
    </Suspense>
  )
}

// ── Router definition ─────────────────────────────────────────
export const router = createBrowserRouter([
  // Public routes
  {
    element: <Suspense fallback={<PageLoader />}><PublicOnlyRoute /></Suspense>,
    children: [
      { path: '/login', element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
    ],
  },

  // Protected routes (semua admin)
  {
    element: <Suspense fallback={<PageLoader />}><PrivateRoute /></Suspense>,
    children: [
      {
        element: <Suspense fallback={<PageLoader />}><AppLayout /></Suspense>,
        children: [
          { path: '/dashboard',        element: <Lazy component={DashboardPage} /> },
          { path: '/audit',            element: <Lazy component={AuditPage} /> },
          { path: '/scheduler',        element: <Lazy component={SchedulerPage} /> },
          { path: '/mahasiswa',        element: <Lazy component={MahasiswaPage} /> },
          { path: '/dosen',            element: <Lazy component={DosenPage} /> },
          { path: '/matakuliah',       element: <Lazy component={MatakuliahPage} /> },
          { path: '/ruangan',          element: <Lazy component={RuanganPage} /> },
          { path: '/program-studi',    element: <Lazy component={ProgramStudiPage} /> },
          { path: '/enrollment',       element: <Lazy component={EnrollmentPage} /> },
          { path: '/laporan',          element: <Lazy component={LaporanPage} /> },
          { path: '/jadwal-pengganti', element: <Lazy component={JadwalPenggantiPage} /> },
          { path: '/import',           element: <Lazy component={ImportPage} /> },
          { path: '/profil',           element: <Lazy component={ProfilPage} /> },

          // ── Fase E: Super Admin only ─────────────────────
          {
            element: <SuperAdminRoute />,
            children: [
              { path: '/super-admin/admins',       element: <Lazy component={AdminManagementPage} /> },
              { path: '/super-admin/konfigurasi',  element: <Lazy component={KonfigurasiPage} /> },
            ],
          },
        ],
      },
    ],
  },

  // Catch-all
  { path: '/', element: <Navigate to="/dashboard" replace /> },
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