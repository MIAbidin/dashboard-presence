// src/components/Layout/Sidebar.tsx
// Update Fase E: tambah section 'Super Admin' di bagian bawah
// (hanya muncul jika role === 'super_admin')

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
  Calendar,
  FileText,
  Activity,
  Building2,
  Library,
  Shield,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

// ── Tipe item navigasi ────────────────────────────────────────
interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

interface NavGroup {
  group: string
  items: NavItem[]
  superAdminOnly?: boolean
}

// ── Definisi menu navigasi ────────────────────────────────────
const NAV_ITEMS: NavGroup[] = [
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
      { label: 'Ruangan',          path: '/ruangan',          icon: Building2 },
      { label: 'Program Studi',    path: '/program-studi',    icon: Library },
      { label: 'Enrollment',       path: '/enrollment',       icon: ClipboardList },
      { label: 'Jadwal Pengganti', path: '/jadwal-pengganti', icon: Calendar },
    ],
  },
  {
    group: 'Laporan & Data',
    items: [
      { label: 'Laporan',     path: '/laporan', icon: BarChart3 },
      { label: 'Import Data', path: '/import',  icon: Upload },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { label: 'Scheduler', path: '/scheduler', icon: Activity },
      { label: 'Audit Log', path: '/audit',     icon: FileText },
    ],
  },
  // ── Fase E: section eksklusif Super Admin ─────────────────
  {
    group: 'Super Admin',
    superAdminOnly: true,
    items: [
      { label: 'Kelola Admin',       path: '/super-admin/admins',      icon: Shield },
      { label: 'Konfigurasi Sistem', path: '/super-admin/konfigurasi', icon: Settings },
    ],
  },
]

// ── Nav item component ────────────────────────────────────────
function NavItemLink({
  item, isCollapsed, isSuperAdmin = false,
}: { item: NavItem; isCollapsed: boolean; isSuperAdmin?: boolean }) {
  const location = useLocation()
  const isActive = location.pathname === item.path
  const Icon = item.icon

  return (
    <li>
      <NavLink
        to={item.path}
        title={isCollapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium',
          'transition-colors duration-150 group relative',
          isActive
            ? isSuperAdmin
              ? 'bg-violet-600 text-white'
              : 'bg-navy-800 text-white'
            : isSuperAdmin
              ? 'text-violet-600/80 dark:text-violet-400/80 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0',
            isActive
              ? 'text-white'
              : isSuperAdmin
                ? 'text-violet-500/70 group-hover:text-violet-600 dark:group-hover:text-violet-300'
                : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
        {!isCollapsed && <span className="truncate">{item.label}</span>}

        {/* Tooltip saat collapsed */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 z-50 hidden group-hover:flex">
            <div className="bg-popover text-popover-foreground text-xs font-medium px-2 py-1 rounded-md shadow-md border border-border whitespace-nowrap">
              {item.label}
            </div>
          </div>
        )}
      </NavLink>
    </li>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────
export default function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

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
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isSuperAdmin ? 'bg-violet-600' : 'bg-navy-800'
        )}>
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>

        {!isSidebarCollapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-foreground leading-none truncate">
              Presensi SKS
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isSuperAdmin ? 'Super Admin' : 'Admin Dashboard'}
            </p>
          </div>
        )}
      </div>

      {/* ── Nav items ─────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
        {NAV_ITEMS.map((group) => {
          // Super Admin section: hanya tampil jika role super_admin
          if (group.superAdminOnly && !isSuperAdmin) return null

          return (
            <div key={group.group}>
              {!isSidebarCollapsed && (
                <p className={cn(
                  'px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest select-none',
                  group.superAdminOnly
                    ? 'text-violet-500/70 dark:text-violet-400/60'
                    : 'text-muted-foreground/60'
                )}>
                  {group.group}
                  {group.superAdminOnly && (
                    <span className="ml-1.5 inline-flex items-center">
                      <Shield className="w-2.5 h-2.5" />
                    </span>
                  )}
                </p>
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItemLink
                    key={item.path}
                    item={item}
                    isCollapsed={isSidebarCollapsed}
                    isSuperAdmin={group.superAdminOnly}
                  />
                ))}
              </ul>

              {!isSidebarCollapsed && (
                <div className={cn(
                  'mt-3 border-b',
                  group.superAdminOnly ? 'border-violet-500/20' : 'border-border/50'
                )} />
              )}
            </div>
          )
        })}
      </nav>

      {/* ── User info + logout ────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border p-2">
        {!isSidebarCollapsed ? (
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
              isSuperAdmin ? 'bg-violet-600' : 'bg-navy-800'
            )}>
              <span className="text-white text-xs font-semibold">
                {user?.nama_lengkap?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate leading-none">
                {user?.nama_lengkap ?? 'Admin'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {isSuperAdmin ? 'Super Admin (IT)' : 'Admin Fakultas'}
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