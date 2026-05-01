import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BarChart3,
  Upload,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { Calendar } from 'lucide-react'

// ── Definisi menu navigasi ────────────────────────────────────
const NAV_ITEMS = [
  {
    group: 'Utama',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Manajemen',
    items: [
      { label: 'Mahasiswa',        path: '/mahasiswa',        icon: Users },
      { label: 'Dosen',            path: '/dosen',            icon: GraduationCap },
      { label: 'Matakuliah',       path: '/matakuliah',       icon: BookOpen },
      { label: 'Enrollment',       path: '/enrollment',       icon: ClipboardList },
      { label: 'Jadwal Pengganti', path: '/jadwal-pengganti', icon: Calendar },  // ← BARU
    ],
  },
  {
    group: 'Laporan & Data',
    items: [
      { label: 'Laporan',     path: '/laporan', icon: BarChart3 },
      { label: 'Import Data', path: '/import',  icon: Upload },
    ],
  },
]

export default function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-border bg-card',
        'transition-all duration-300 ease-in-out flex-shrink-0',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* ── Logo / brand ─────────────────────────────────── */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3 gap-3 flex-shrink-0',
          isSidebarCollapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-navy-800 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>

        {!isSidebarCollapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-foreground leading-none truncate">
              Presensi SKS
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Admin Dashboard</p>
          </div>
        )}
      </div>

      {/* ── Nav items ─────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            {/* Group label — sembunyikan saat collapsed */}
            {!isSidebarCollapsed && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                {group.group}
              </p>
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium',
                        'transition-colors duration-150 group relative',
                        isActive
                          ? 'bg-navy-800 text-white'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0',
                          isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />

                      {!isSidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Tooltip saat collapsed */}
                      {isSidebarCollapsed && (
                        <div className="absolute left-full ml-2 z-50 hidden group-hover:flex">
                          <div className="bg-popover text-popover-foreground text-xs font-medium px-2 py-1 rounded-md shadow-md border border-border whitespace-nowrap">
                            {item.label}
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>

            {/* Divider antar group */}
            {!isSidebarCollapsed && (
              <div className="mt-3 border-b border-border/50" />
            )}
          </div>
        ))}
      </nav>

      {/* ── User info + logout ────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border p-2">
        {!isSidebarCollapsed ? (
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">
                {user?.nama_lengkap?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate leading-none">
                {user?.nama_lengkap ?? 'Admin'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {user?.email ?? ''}
              </p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Logout"
            className="w-full flex items-center justify-center h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Toggle collapse button ────────────────────────── */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute -right-3 top-16 z-10',
          'w-6 h-6 rounded-full border border-border bg-card shadow-sm',
          'flex items-center justify-center',
          'hover:bg-accent transition-colors',
          'text-muted-foreground hover:text-foreground'
        )}
        title={isSidebarCollapsed ? 'Perlebar sidebar' : 'Ciutkan sidebar'}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  )
}