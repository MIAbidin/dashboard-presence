import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Shield, Search, X, RefreshCw, ChevronLeft, ChevronRight,
  ChevronDown, User, BookOpen, ClipboardList, Key,
  ScanFace, Trash2, Upload, Download, Settings,
  Calendar, Clock, Filter,
} from 'lucide-react'
import { fetchAuditLogs } from '@/api/scheduler.api'
import type { AuditLogItem } from '@/api/scheduler.api'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

function fmtTgl(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtTglRelative(iso: string | null) {
  if (!iso) return '-'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60)    return `${s} detik lalu`
  const m = Math.round(s / 60)
  if (m < 60)    return `${m} menit lalu`
  const h = Math.round(m / 60)
  if (h < 24)    return `${h} jam lalu`
  const d = Math.round(h / 24)
  return `${d} hari lalu`
}

// ── Aksi mapping ──────────────────────────────────────────────

const AKSI_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CREATE_USER        : { label: 'Buat User',         icon: <User className="w-3 h-3" />,         color: 'text-green-600 bg-green-500/10 dark:text-green-400' },
  UPDATE_USER        : { label: 'Update User',        icon: <User className="w-3 h-3" />,         color: 'text-blue-600 bg-blue-500/10 dark:text-blue-400' },
  DELETE_USER        : { label: 'Hapus User',         icon: <Trash2 className="w-3 h-3" />,       color: 'text-red-600 bg-red-500/10 dark:text-red-400' },
  RESET_FACE         : { label: 'Reset Wajah',        icon: <ScanFace className="w-3 h-3" />,     color: 'text-violet-600 bg-violet-500/10 dark:text-violet-400' },
  RESET_PASSWORD     : { label: 'Reset Password',     icon: <Key className="w-3 h-3" />,          color: 'text-amber-600 bg-amber-500/10 dark:text-amber-400' },
  CHANGE_PASSWORD    : { label: 'Ganti Password',     icon: <Key className="w-3 h-3" />,          color: 'text-amber-600 bg-amber-500/10 dark:text-amber-400' },
  CREATE_MATAKULIAH  : { label: 'Buat Matakuliah',    icon: <BookOpen className="w-3 h-3" />,     color: 'text-green-600 bg-green-500/10 dark:text-green-400' },
  UPDATE_MATAKULIAH  : { label: 'Update Matakuliah',  icon: <BookOpen className="w-3 h-3" />,     color: 'text-blue-600 bg-blue-500/10 dark:text-blue-400' },
  DELETE_MATAKULIAH  : { label: 'Hapus Matakuliah',   icon: <Trash2 className="w-3 h-3" />,       color: 'text-red-600 bg-red-500/10 dark:text-red-400' },
  TOGGLE_IZIN_TAMU   : { label: 'Toggle Izin Tamu',   icon: <Settings className="w-3 h-3" />,     color: 'text-cyan-600 bg-cyan-500/10 dark:text-cyan-400' },
  ENROLL             : { label: 'Enroll',             icon: <ClipboardList className="w-3 h-3" />,color: 'text-green-600 bg-green-500/10 dark:text-green-400' },
  UNENROLL           : { label: 'Unenroll',           icon: <ClipboardList className="w-3 h-3" />,color: 'text-red-600 bg-red-500/10 dark:text-red-400' },
  IMPORT_MAHASISWA   : { label: 'Import Mahasiswa',   icon: <Upload className="w-3 h-3" />,       color: 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400' },
  IMPORT_DOSEN       : { label: 'Import Dosen',       icon: <Upload className="w-3 h-3" />,       color: 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400' },
  EXPORT_LAPORAN     : { label: 'Export Laporan',     icon: <Download className="w-3 h-3" />,     color: 'text-gray-600 bg-gray-500/10 dark:text-gray-400' },
  SCHEDULER_START    : { label: 'Start Scheduler',    icon: <Settings className="w-3 h-3" />,     color: 'text-green-600 bg-green-500/10 dark:text-green-400' },
  SCHEDULER_STOP     : { label: 'Stop Scheduler',     icon: <Settings className="w-3 h-3" />,     color: 'text-red-600 bg-red-500/10 dark:text-red-400' },
}

function AksiBadge({ aksi }: { aksi: string }) {
  const cfg = AKSI_CONFIG[aksi]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
      cfg?.color ?? 'text-muted-foreground bg-muted'
    )}>
      {cfg?.icon}
      {cfg?.label ?? aksi}
    </span>
  )
}

// ── Entitas badge ─────────────────────────────────────────────

const ENTITAS_COLOR: Record<string, string> = {
  user       : 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
  matakuliah : 'text-violet-600 bg-violet-500/10 dark:text-violet-400',
  enrollment : 'text-green-600 bg-green-500/10 dark:text-green-400',
  sesi       : 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
}

// ── Detail Drawer ─────────────────────────────────────────────

function DetailDrawer({ log, onClose }: { log: AuditLogItem; onClose: () => void }) {
  let parsedDetail: Record<string, unknown> | null = null
  try {
    if (log.detail) parsedDetail = JSON.parse(log.detail)
  } catch { /* not json */ }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Detail Log</h2>
              <p className="text-[11px] text-muted-foreground font-mono">{log.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Aksi & waktu */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Aksi</p>
              <AksiBadge aksi={log.aksi} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Waktu</p>
              <p className="text-sm text-foreground">{fmtTgl(log.created_at)}</p>
              <p className="text-[11px] text-muted-foreground">{fmtTglRelative(log.created_at)}</p>
            </div>
          </div>

          {/* Admin */}
          <div className="rounded-xl border border-border p-4 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Pelaku</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-navy-800/10 border border-navy-800/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-navy-800 dark:text-white">
                  {log.admin_nama[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{log.admin_nama}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{log.admin_nidn}</p>
              </div>
            </div>
          </div>

          {/* Entitas */}
          {(log.entitas || log.entitas_id) && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Objek yang Diubah</p>
              <div className="rounded-xl border border-border p-3 space-y-1.5">
                {log.entitas && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-16">Entitas</span>
                    <span className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-md',
                      ENTITAS_COLOR[log.entitas] ?? 'text-muted-foreground bg-muted'
                    )}>
                      {log.entitas}
                    </span>
                  </div>
                )}
                {log.entitas_id && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">ID</span>
                    <span className="text-[11px] font-mono text-foreground break-all">{log.entitas_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detail JSON */}
          {log.detail && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Detail</p>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                {parsedDetail ? (
                  <div className="space-y-1.5">
                    {Object.entries(parsedDetail).map(([k, v]) => (
                      <div key={k} className="flex items-start gap-2">
                        <span className="text-[11px] text-muted-foreground min-w-[80px] flex-shrink-0">{k}</span>
                        <span className="text-[11px] text-foreground font-mono break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-foreground font-mono">{log.detail}</p>
                )}
              </div>
            </div>
          )}

          {/* IP Address */}
          {log.ip_address && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">IP Address</p>
              <p className="text-sm font-mono text-foreground">{log.ip_address}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[16, 28, 20, 24, 20, 16].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${w * 5}px`, maxWidth: '100%' }} />
        </td>
      ))}
    </tr>
  )
}

// ── Filter Dropdown ───────────────────────────────────────────

const ENTITAS_OPTIONS = ['user', 'matakuliah', 'enrollment', 'sesi', 'laporan', 'scheduler']
const AKSI_OPTIONS    = Object.keys(AKSI_CONFIG)

// ── Main Page ─────────────────────────────────────────────────

export default function AuditLog() {
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [filterEntitas, setFEntitas]= useState('')
  const [filterAksi, setFAksi]      = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)

  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    clearTimeout((handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setPage(1)
    }, 400)
  }, [])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey : ['admin-audit-log', page, filterEntitas, filterAksi, search],
    queryFn  : () => fetchAuditLogs({
      page,
      limit   : 50,
      entitas : filterEntitas || undefined,
      aksi    : filterAksi    || undefined,
    }),
    staleTime: 30_000,
  })

  // Client-side search filter (by admin name/nidn or aksi)
  const filtered = (data?.items ?? []).filter(log => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      log.admin_nama.toLowerCase().includes(q) ||
      log.admin_nidn.toLowerCase().includes(q) ||
      log.aksi.toLowerCase().includes(q) ||
      (log.entitas_id ?? '').toLowerCase().includes(q)
    )
  })

  const hasFilter = !!filterEntitas || !!filterAksi || !!search

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Rekam jejak semua aktivitas admin — siapa, kapan, apa yang diubah.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Stats Strip ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Log',      value: data?.total ?? 0,
            icon: <Shield className="w-4 h-4 text-primary" />,   bg: 'bg-primary/10' },
          { label: 'Halaman',        value: `${data?.page ?? 1}/${data?.total_pages ?? 1}`,
            icon: <Clock className="w-4 h-4 text-violet-500" />, bg: 'bg-violet-500/10' },
          { label: 'Filter Aktif',   value: hasFilter ? 'Ya' : 'Tidak',
            icon: <Filter className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-500/10' },
          { label: 'Ditampilkan',    value: filtered.length,
            icon: <Calendar className="w-4 h-4 text-green-500" />, bg: 'bg-green-500/10' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', s.bg)}>
              {s.icon}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">
                {isLoading ? '—' : s.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari admin, NIDN, atau aksi..."
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
          {search && (
            <button onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter entitas */}
        <div className="relative">
          <select
            value={filterEntitas}
            onChange={e => { setFEntitas(e.target.value); setPage(1) }}
            className="h-9 rounded-lg border border-border bg-background pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer text-sm"
          >
            <option value="">Semua Entitas</option>
            {ENTITAS_OPTIONS.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Filter aksi */}
        <div className="relative">
          <select
            value={filterAksi}
            onChange={e => { setFAksi(e.target.value); setPage(1) }}
            className="h-9 rounded-lg border border-border bg-background pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer text-sm"
          >
            <option value="">Semua Aksi</option>
            {AKSI_OPTIONS.map(a => (
              <option key={a} value={a}>{AKSI_CONFIG[a]?.label ?? a}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Reset */}
        {hasFilter && (
          <button
            onClick={() => { setSearch(''); setFEntitas(''); setFAksi(''); setPage(1) }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}

        <p className="text-xs text-muted-foreground ml-auto">
          {data?.total ?? 0} total log
        </p>
      </div>

      {/* ── Tabel ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Waktu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Entitas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">ID / Target</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">IP</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Shield className="w-8 h-8 opacity-25" />
                      <p className="text-sm">
                        {hasFilter ? 'Tidak ada log yang cocok dengan filter' : 'Belum ada aktivitas admin'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/20 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Waktu */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-foreground">
                        {fmtTglRelative(log.created_at)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })
                          : '-'}
                      </p>
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-navy-800/10 border border-navy-800/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-navy-800 dark:text-white">
                            {log.admin_nama[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                            {log.admin_nama}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">{log.admin_nidn}</p>
                        </div>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3">
                      <AksiBadge aksi={log.aksi} />
                    </td>

                    {/* Entitas */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {log.entitas ? (
                        <span className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-md',
                          ENTITAS_COLOR[log.entitas] ?? 'text-muted-foreground bg-muted'
                        )}>
                          {log.entitas}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* ID */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {log.entitas_id ? (
                        <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[140px]">
                          {log.entitas_id}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {log.ip_address ?? '—'}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <span className="opacity-0 group-hover:opacity-100 text-[11px] text-primary hover:underline transition-opacity cursor-pointer">
                        Lihat →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Halaman {data.page} dari {data.total_pages} · {data.total} total log
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(data.total_pages, 5) }).map((_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      page === p
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-muted-foreground hover:bg-muted'
                    )}>
                    {p}
                  </button>
                )
              })}
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ────────────────────────────────── */}
      {selectedLog && (
        <DetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}