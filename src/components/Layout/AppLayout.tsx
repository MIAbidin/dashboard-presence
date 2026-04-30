import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/**
 * AppLayout — wrapper utama untuk semua halaman yang memerlukan autentikasi.
 *
 * Struktur:
 * ┌──────────────────────────────────────────────┐
 * │  Sidebar (fixed left)  │  Topbar (top)       │
 * │                        ├─────────────────────│
 * │                        │  <Outlet /> (konten)│
 * └──────────────────────────────────────────────┘
 */
export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar — fixed kiri, full height */}
      <Sidebar />

      {/* Konten utama — mengisi sisa lebar */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar — fixed atas */}
        <Topbar />

        {/* Main content area — scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="animate-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}