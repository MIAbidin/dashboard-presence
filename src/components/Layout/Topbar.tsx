// src/components/Layout/Topbar.tsx
// Update Fase D: tambah label '/program-studi' di PAGE_LABELS

import { useLocation, Link } from 'react-router-dom'
import { Moon, Sun, Bell, ChevronRight, User, LogOut, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

// ── Map path → label untuk breadcrumb ────────────────────────
const PAGE_LABELS: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/mahasiswa':        'Mahasiswa',
  '/dosen':            'Dosen',
  '/matakuliah':       'Matakuliah',
  '/ruangan':          'Ruangan Kuliah',
  '/program-studi':    'Program Studi',       // ← Fase D
  '/enrollment':       'Enrollment',
  '/laporan':          'Laporan',
  '/import':           'Import Data',
  '/jadwal-pengganti': 'Jadwal Pengganti',
  '/profil':           'Profil Saya',
  '/scheduler':        'Scheduler',
  '/audit':            'Audit Log',
}

export default function Topbar() {
  const { isDarkMode, toggleDarkMode } = useUIStore()
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const segments = location.pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/')
    return {
      path,
      label: PAGE_LABELS[path] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
    }
  })

  return (
    <header className="h-14 flex-shrink-0 border-b border-border bg-card flex items-center px-4 gap-4">
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        <Link
          to="/dashboard"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors shrink-0"
        >
          Admin
        </Link>

        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            {i === breadcrumbs.length - 1 ? (
              <span className="text-xs font-semibold text-foreground truncate">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* ── Right actions ────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          className={cn(
            'relative w-8 h-8 rounded-lg flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
          )}
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
        </button>

        <button
          onClick={toggleDarkMode}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
          )}
          title={isDarkMode ? 'Light mode' : 'Dark mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1.5',
              'hover:bg-accent transition-colors',
              isDropdownOpen && 'bg-accent'
            )}
          >
            <div className="w-6 h-6 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">
                {user?.nama_lengkap?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-foreground leading-none truncate max-w-[120px]">
                {user?.nama_lengkap ?? 'Admin'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Administrator</p>
            </div>
          </button>

          {isDropdownOpen && (
            <div
              className={cn(
                'absolute right-0 top-full mt-1.5 w-52 z-50',
                'rounded-xl border border-border bg-popover shadow-lg shadow-black/10',
                'overflow-hidden animate-in'
              )}
            >
              <div className="px-3 py-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.nama_lengkap ?? 'Admin'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {user?.email ?? ''}
                </p>
                <span className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-navy-800/10 text-navy-800 dark:text-navy-200 dark:bg-navy-800/30 text-[10px] font-semibold">
                  Administrator
                </span>
              </div>

              <div className="py-1">
                <Link
                  to="/profil"
                  onClick={() => setIsDropdownOpen(false)}
                  className={cn('flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors')}
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Profil Saya
                </Link>
                <Link
                  to="/profil"
                  onClick={() => setIsDropdownOpen(false)}
                  className={cn('flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors')}
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  Pengaturan
                </Link>
              </div>

              <div className="border-t border-border py-1">
                <button
                  onClick={() => { setIsDropdownOpen(false); logout() }}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}