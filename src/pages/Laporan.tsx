import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BarChart3, Download, FileSpreadsheet, FileText,
  Filter, X, Search, ChevronRight, Loader2,
  RefreshCw, Eye, TrendingUp, TrendingDown,
  Users, BookOpen, GraduationCap, Calendar,
  Clock, AlertCircle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  fetchLaporanGlobal, fetchLaporanDetail,
  downloadLaporan,
} from '@/api/laporan.api'
import { fetchMatakuliah } from '@/api/matakuliah.api'
import { fetchUsers } from '@/api/users.api'
import type { LaporanItem, LaporanFilterParams, SesiDetail, PresensiDetail } from '@/api/laporan.api'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// KONSTANTA & HELPERS
// ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  hadir    : 'text-green-600 dark:text-green-400 bg-green-500/10',
  terlambat: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  absen    : 'text-red-600 dark:text-red-400 bg-red-500/10',
  izin     : 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  sakit    : 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
}

function pctColor(p: number) {
  if (p >= 75) return 'bg-green-500'
  if (p >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function pctTextColor(p: number) {
  if (p >= 75) return 'text-green-600 dark:text-green-400'
  if (p >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function fmtTgl(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtWaktu(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  })
}

// ─────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[20, 40, 28, 20, 16, 16, 16, 60, 16].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${w * 4}px`, maxWidth: '100%' }} />
        </td>
      ))}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL FILTER
// ─────────────────────────────────────────────────────────────

interface FilterState {
  matakuliah_id  : string
  dosen_id       : string
  program_studi  : string
  periode_mulai  : string
  periode_selesai: string
  mode           : string
}

const EMPTY_FILTER: FilterState = {
  matakuliah_id: '', dosen_id: '', program_studi: '',
  periode_mulai: '', periode_selesai: '', mode: '',
}

function FilterPanel({
  filter,
  onChange,
  onApply,
  onReset,
  isLoading,
}: {
  filter   : FilterState
  onChange : (f: FilterState) => void
  onApply  : () => void
  onReset  : () => void
  isLoading: boolean
}) {
  const [open, setOpen] = useState(true)

  const { data: mkData } = useQuery({
    queryKey : ['laporan-mk-options'],
    queryFn  : () => fetchMatakuliah({ limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const { data: dosenData } = useQuery({
    queryKey : ['laporan-dosen-options'],
    queryFn  : () => fetchUsers({ role: 'dosen', limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const hasFilter = Object.values(filter).some(Boolean)

  const sel = (cls: string) => cn(
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm',
    'outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer',
    'text-foreground'
  )

  const inp = cn(
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm',
    'outline-none focus:ring-2 focus:ring-ring/50 transition-all'
  )

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">
          Filter Laporan
        </span>
        {hasFilter && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            Aktif
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Matakuliah */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Matakuliah</label>
              <div className="relative">
                <select
                  value={filter.matakuliah_id}
                  onChange={e => onChange({ ...filter, matakuliah_id: e.target.value })}
                  className={sel('')}
                >
                  <option value="">Semua matakuliah</option>
                  {mkData?.items.map(mk => (
                    <option key={mk.id} value={mk.id}>{mk.kode} — {mk.nama}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Dosen */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dosen</label>
              <div className="relative">
                <select
                  value={filter.dosen_id}
                  onChange={e => onChange({ ...filter, dosen_id: e.target.value })}
                  className={sel('')}
                >
                  <option value="">Semua dosen</option>
                  {dosenData?.items.map(d => (
                    <option key={d.id} value={d.id}>{d.nama_lengkap}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Program Studi */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Program Studi</label>
              <input
                value={filter.program_studi}
                onChange={e => onChange({ ...filter, program_studi: e.target.value })}
                placeholder="Cth: Teknik Informatika"
                className={inp}
              />
            </div>

            {/* Periode Mulai */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Periode Mulai</label>
              <input
                type="date"
                value={filter.periode_mulai}
                onChange={e => onChange({ ...filter, periode_mulai: e.target.value })}
                className={inp}
              />
            </div>

            {/* Periode Selesai */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Periode Selesai</label>
              <input
                type="date"
                value={filter.periode_selesai}
                onChange={e => onChange({ ...filter, periode_selesai: e.target.value })}
                className={inp}
              />
            </div>

            {/* Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mode Kelas</label>
              <div className="relative">
                <select
                  value={filter.mode}
                  onChange={e => onChange({ ...filter, mode: e.target.value })}
                  className={sel('')}
                >
                  <option value="">Semua mode</option>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onApply}
              disabled={isLoading}
              className="flex items-center gap-1.5 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Filter className="w-3.5 h-3.5" />}
              Terapkan Filter
            </button>
            {hasFilter && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RINGKASAN STATS
// ─────────────────────────────────────────────────────────────

function RingkasanStrip({
  total_sesi, total_presensi, rata_rata_kehadiran, total_mk,
  isLoading,
}: {
  total_sesi          : number
  total_presensi      : number
  rata_rata_kehadiran : number
  total_mk            : number
  isLoading           : boolean
}) {
  const stats = [
    { label: 'Matakuliah',        value: total_mk,            icon: <BookOpen className="w-4 h-4 text-blue-500" />,   bg: 'bg-blue-500/10' },
    { label: 'Total Sesi',        value: total_sesi,          icon: <Calendar className="w-4 h-4 text-violet-500" />, bg: 'bg-violet-500/10' },
    { label: 'Total Presensi',    value: total_presensi,      icon: <Users className="w-4 h-4 text-green-500" />,     bg: 'bg-green-500/10' },
    { label: 'Rata-rata Kehadiran', value: `${rata_rata_kehadiran}%`, icon:
        rata_rata_kehadiran >= 75
          ? <TrendingUp className="w-4 h-4 text-green-500" />
          : <TrendingDown className="w-4 h-4 text-amber-500" />,
      bg: rata_rata_kehadiran >= 75 ? 'bg-green-500/10' : 'bg-amber-500/10' },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', s.bg)}>
            {s.icon}
          </div>
          <div>
            {isLoading
              ? <div className="h-5 w-12 rounded bg-muted animate-pulse" />
              : <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SHEET DETAIL LAPORAN
// ─────────────────────────────────────────────────────────────

function SheetDetail({
  item,
  onClose,
}: {
  item   : LaporanItem
  onClose: () => void
}) {
  const [view, setView] = useState<'pertemuan' | 'sesi'>('pertemuan')

  const { data, isLoading } = useQuery({
    queryKey: ['laporan-detail', item.matakuliah_id],
    queryFn : () => fetchLaporanDetail({ matakuliah_id: item.matakuliah_id }),
    staleTime: 30_000,
  })

  const sesiList: SesiDetail[] = data?.sesi_list ?? []
  const [expandedSesi, setExpandedSesi] = useState<string | null>(null)

  const { data: sesiDetailData, isLoading: loadingSesiDetail } = useQuery({
    queryKey: ['laporan-sesi-detail', expandedSesi],
    queryFn : () => expandedSesi ? fetchLaporanDetail({ sesi_id: expandedSesi }) : null,
    enabled : !!expandedSesi,
    staleTime: 60_000,
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-3xl bg-card border-l border-border shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">
                {item.kode}
              </span>
              {item.hari && (
                <span className="text-[11px] text-muted-foreground">{item.hari}</span>
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground truncate">{item.nama}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              {item.nama_dosen}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-5 gap-0 border-b border-border flex-shrink-0 divide-x divide-border">
          {[
            { label: 'Pertemuan',  value: item.total_pertemuan },
            { label: 'Hadir',      value: item.hadir,      color: 'text-green-500' },
            { label: 'Terlambat',  value: item.terlambat,  color: 'text-amber-500' },
            { label: 'Absen',      value: item.absen,      color: 'text-red-500' },
            { label: '% Hadir',    value: `${item.persentase}%`, color: pctTextColor(item.persentase) },
          ].map((s) => (
            <div key={s.label} className="text-center py-3 px-2">
              <p className={cn('text-lg font-bold', s.color ?? 'text-foreground')}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Tingkat Kehadiran</span>
            <span className={cn('text-xs font-bold', pctTextColor(item.persentase))}>
              {item.persentase}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pctColor(item.persentase))}
              style={{ width: `${item.persentase}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sesiList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <Calendar className="w-8 h-8 opacity-30" />
              <p className="text-sm">Belum ada data sesi</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sesiList.map((sesi) => (
                <div key={sesi.sesi_id}>
                  {/* Sesi row */}
                  <button
                    onClick={() => setExpandedSesi(
                      expandedSesi === sesi.sesi_id ? null : sesi.sesi_id
                    )}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors text-left"
                  >
                    {/* Pertemuan badge */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      {sesi.pertemuan_ke}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                          sesi.mode === 'online'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-green-500/10 text-green-500'
                        )}>
                          {sesi.mode.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {fmtTgl(sesi.waktu_buka)}
                        </span>
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                          sesi.status === 'aktif'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {sesi.status}
                        </span>
                      </div>
                      {/* Mini progress */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', pctColor(sesi.persentase))}
                            style={{ width: `${sesi.persentase}%` }}
                          />
                        </div>
                        <span className={cn('text-[11px] font-bold flex-shrink-0', pctTextColor(sesi.persentase))}>
                          {sesi.persentase}%
                        </span>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">
                          ({sesi.hadir_efektif}/{sesi.total})
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronDown className={cn(
                      'w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform',
                      expandedSesi === sesi.sesi_id && 'rotate-180'
                    )} />
                  </button>

                  {/* Expanded detail */}
                  {expandedSesi === sesi.sesi_id && (
                    <div className="bg-muted/20 border-t border-border">
                      {loadingSesiDetail ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {(sesiDetailData?.detail ?? []).map((p: PresensiDetail) => (
                            <div key={p.presensi_id} className="flex items-center gap-3 px-8 py-2.5">
                              <div className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-foreground">
                                  {p.nama_lengkap[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{p.nama_lengkap}</p>
                                <p className="text-[10px] text-muted-foreground">{p.nim}</p>
                              </div>
                              <span className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                STATUS_COLOR[p.status] ?? 'bg-muted text-muted-foreground'
                              )}>
                                {p.status}
                              </span>
                              {p.waktu_presensi && (
                                <span className="text-[10px] text-muted-foreground hidden sm:block">
                                  {fmtWaktu(p.waktu_presensi)}
                                </span>
                              )}
                              {p.akurasi_wajah != null && (
                                <span className="text-[10px] text-muted-foreground hidden md:block">
                                  {p.akurasi_wajah.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          ))}
                          {(sesiDetailData?.detail ?? []).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">Belum ada data presensi</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// TABEL LAPORAN
// ─────────────────────────────────────────────────────────────

function TabelLaporan({
  items,
  isLoading,
  onDetail,
  page,
  totalPages,
  onPageChange,
}: {
  items       : LaporanItem[]
  isLoading   : boolean
  onDetail    : (item: LaporanItem) => void
  page        : number
  totalPages  : number
  onPageChange: (p: number) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-8">No</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Matakuliah</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Dosen</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground w-20">Ptm</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground w-16 hidden sm:table-cell">Hadir</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground w-20 hidden sm:table-cell">Terlambat</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground w-16 hidden sm:table-cell">Absen</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground min-w-[140px]">% Hadir</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 opacity-25" />
                    <p className="text-sm">Tidak ada data laporan untuk filter ini</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.matakuliah_id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {(page - 1) * 20 + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold font-mono flex-shrink-0">
                        {item.kode}
                      </span>
                      <p className="text-sm font-medium text-foreground leading-tight">{item.nama}</p>
                    </div>
                    {item.hari && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {item.hari} {item.jam_mulai && `· ${item.jam_mulai}`}
                        {item.jam_selesai && ` – ${item.jam_selesai}`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-sm text-foreground">{item.nama_dosen}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{item.nidn}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-foreground">{item.total_pertemuan}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{item.hadir}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{item.terlambat}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">{item.absen}</span>
                  </td>
                  {/* Progress bar persentase */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs font-bold', pctTextColor(item.persentase))}>
                          {item.persentase}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.hadir_efektif}/{item.total}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', pctColor(item.persentase))}
                          style={{ width: `${item.persentase}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDetail(item)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all ml-auto"
                    >
                      <Eye className="w-3 h-3" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                    page === p
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EXPORT BUTTONS
// ─────────────────────────────────────────────────────────────

function ExportButtons({
  activeFilter,
}: {
  activeFilter: LaporanFilterParams
}) {
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [loadingPdf,   setLoadingPdf]   = useState(false)

  const buildFilename = (ext: string) => {
    const parts = ['laporan_kehadiran']
    if (activeFilter.periode_mulai)   parts.push(activeFilter.periode_mulai)
    if (activeFilter.periode_selesai) parts.push(`sd_${activeFilter.periode_selesai}`)
    return `${parts.join('_')}.${ext}`
  }

  const handleExcel = async () => {
    setLoadingExcel(true)
    try {
      await downloadLaporan('excel', activeFilter, buildFilename('xlsx'))
      toast.success('File Excel berhasil didownload')
    } catch {
      toast.error('Gagal mengunduh file Excel')
    } finally {
      setLoadingExcel(false)
    }
  }

  const handlePdf = async () => {
    setLoadingPdf(true)
    try {
      await downloadLaporan('pdf', activeFilter, buildFilename('pdf'))
      toast.success('File PDF berhasil didownload')
    } catch {
      toast.error('Gagal mengunduh file PDF. Pastikan reportlab terinstall di server.')
    } finally {
      setLoadingPdf(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExcel}
        disabled={loadingExcel}
        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
      >
        {loadingExcel
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileSpreadsheet className="w-3.5 h-3.5" />}
        Excel
      </button>
      <button
        onClick={handlePdf}
        disabled={loadingPdf}
        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {loadingPdf
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileText className="w-3.5 h-3.5" />}
        PDF
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function Laporan() {
  const [filter, setFilter]           = useState<FilterState>(EMPTY_FILTER)
  const [appliedFilter, setApplied]   = useState<FilterState>(EMPTY_FILTER)
  const [page, setPage]               = useState(1)
  const [detailItem, setDetailItem]   = useState<LaporanItem | null>(null)

  const params: LaporanFilterParams = {
    matakuliah_id  : appliedFilter.matakuliah_id   || undefined,
    dosen_id       : appliedFilter.dosen_id         || undefined,
    program_studi  : appliedFilter.program_studi    || undefined,
    periode_mulai  : appliedFilter.periode_mulai    || undefined,
    periode_selesai: appliedFilter.periode_selesai  || undefined,
    mode           : appliedFilter.mode             || undefined,
    page,
    limit: 20,
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey : ['admin-laporan', appliedFilter, page],
    queryFn  : () => fetchLaporanGlobal(params),
    staleTime: 30_000,
  })

  const handleApply = () => {
    setApplied(filter)
    setPage(1)
  }

  const handleReset = () => {
    setFilter(EMPTY_FILTER)
    setApplied(EMPTY_FILTER)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan Kehadiran</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Rekap kehadiran global seluruh matakuliah dengan filter canggih.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons activeFilter={params} />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────── */}
      <FilterPanel
        filter={filter}
        onChange={setFilter}
        onApply={handleApply}
        onReset={handleReset}
        isLoading={isLoading && !!Object.values(filter).some(Boolean)}
      />

      {/* ── Ringkasan Stats ────────────────────────────── */}
      <RingkasanStrip
        total_sesi          = {data?.ringkasan.total_sesi ?? 0}
        total_presensi      = {data?.ringkasan.total_presensi ?? 0}
        rata_rata_kehadiran = {data?.ringkasan.rata_rata_kehadiran ?? 0}
        total_mk            = {data?.total ?? 0}
        isLoading           = {isLoading}
      />

      {/* ── Export hint ────────────────────────────────── */}
      {data && data.total > 0 && !isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30">
          <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {data.total} matakuliah ditemukan.
            Export ke Excel atau PDF menggunakan filter yang aktif saat ini.
          </p>
        </div>
      )}

      {/* ── Tabel ──────────────────────────────────────── */}
      <TabelLaporan
        items       = {data?.items ?? []}
        isLoading   = {isLoading}
        onDetail    = {setDetailItem}
        page        = {page}
        totalPages  = {data?.total_pages ?? 1}
        onPageChange= {setPage}
      />

      {/* ── Sheet Detail ───────────────────────────────── */}
      {detailItem && (
        <SheetDetail
          item    = {detailItem}
          onClose = {() => setDetailItem(null)}
        />
      )}
    </div>
  )
}