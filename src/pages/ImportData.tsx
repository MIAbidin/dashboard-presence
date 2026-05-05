import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Upload, Download, CheckCircle2, XCircle, AlertTriangle,
  FileSpreadsheet, Loader2, RefreshCw, Users, GraduationCap,
  Info, X, Eye, ArrowRight, RotateCcw, Calendar,
  FileText, Filter,
} from 'lucide-react'
import {
  previewImportMahasiswa, previewImportDosen,
  importMahasiswa, importDosen,
  downloadTemplateMahasiswa, downloadTemplateDosen,
} from '@/api/import.api'
import {
  previewJadwal, importJadwal, downloadTemplateJadwal,
} from '@/api/import_jadwal.api'
import type { PreviewResult, ImportResult } from '@/api/import.api'
import type {
  PreviewJadwalResponse, ImportJadwalResult,
  ParsedJadwalRow, JadwalRowStatus,
} from '@/api/import_jadwal.api'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────

type TabType  = 'mahasiswa' | 'dosen' | 'jadwal'
type StepType = 'upload' | 'preview' | 'result'

const STATUS_JADWAL_CONFIG: Record<JadwalRowStatus, {
  label: string
  color: string
  bg   : string
  icon : React.ReactNode
}> = {
  baru    : { label: 'Baru',      color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-500/10',   icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
  diupdate: { label: 'Diupdate',  color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-500/10',    icon: <RefreshCw className="w-2.5 h-2.5" /> },
  warning : { label: 'Warning',   color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10',   icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  error   : { label: 'Error',     color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-500/10',     icon: <XCircle className="w-2.5 h-2.5" /> },
}

// ── Helper: ukuran file ───────────────────────────────────────

function fmtSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Komponen: Tab switcher ────────────────────────────────────

function TabSwitcher({
  active,
  onChange,
}: {
  active  : TabType
  onChange: (t: TabType) => void
}) {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'mahasiswa', label: 'Import Mahasiswa', icon: <Users className="w-4 h-4" /> },
    { id: 'dosen',     label: 'Import Dosen',     icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'jadwal',    label: 'Import Jadwal',    icon: <Calendar className="w-4 h-4" /> },
  ]
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            active === tab.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Komponen: Step Indicator ──────────────────────────────────

function StepIndicator({ step }: { step: StepType }) {
  const steps: { id: StepType; label: string }[] = [
    { id: 'upload',  label: 'Upload File' },
    { id: 'preview', label: 'Preview Data' },
    { id: 'result',  label: 'Hasil Import' },
  ]
  const currentIdx = steps.findIndex(s => s.id === step)

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, idx) => {
        const isActive    = s.id === step
        const isCompleted = idx < currentIdx

        return (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors',
                isCompleted ? 'bg-green-600 text-white' :
                isActive    ? 'bg-primary text-primary-foreground' :
                              'bg-muted text-muted-foreground'
              )}>
                {isCompleted
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <span>{idx + 1}</span>
                }
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:block',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                'h-px w-8 mx-3 transition-colors',
                idx < currentIdx ? 'bg-green-600' : 'bg-border'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Komponen: Dropzone Upload ─────────────────────────────────

function DropzoneUpload({
  tab,
  onFileSelected,
  isLoading,
  acceptPdf,
}: {
  tab           : TabType
  onFileSelected: (file: File) => void
  isLoading     : boolean
  acceptPdf    ?: boolean
}) {
  const inputRef     = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const colorMap: Record<TabType, { bg: string; icon: string; btn: string }> = {
    mahasiswa: { bg: 'bg-blue-500/10',   icon: 'text-blue-500',   btn: 'bg-blue-600 hover:bg-blue-700' },
    dosen    : { bg: 'bg-violet-500/10', icon: 'text-violet-500', btn: 'bg-violet-600 hover:bg-violet-700' },
    jadwal   : { bg: 'bg-amber-500/10',  icon: 'text-amber-500',  btn: 'bg-amber-600 hover:bg-amber-700' },
  }
  const colors = colorMap[tab]

  const validExts = acceptPdf ? ['.xlsx', '.xls', '.pdf'] : ['.xlsx', '.xls']
  const acceptStr = acceptPdf ? '.xlsx,.xls,.pdf' : '.xlsx,.xls'

  const handleFile = useCallback((file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!validExts.includes(ext)) {
      toast.error(`Format file tidak didukung. Gunakan: ${validExts.join(', ')}`)
      return
    }
    const maxSize = acceptPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(`Ukuran file maksimal ${acceptPdf ? '10' : '5'}MB`)
      return
    }
    onFileSelected(file)
  }, [onFileSelected, validExts, acceptPdf])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Membaca file...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', colors.bg)}>
            {acceptPdf
              ? <FileText className={cn('w-8 h-8', colors.icon)} />
              : <FileSpreadsheet className={cn('w-8 h-8', colors.icon)} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Drag & drop file di sini
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              atau klik untuk memilih ({validExts.join(', ')}, maks {acceptPdf ? '10' : '5'}MB)
            </p>
          </div>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
              colors.btn
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Pilih File
          </button>
        </div>
      )}
    </div>
  )
}

// ── Komponen: Preview Table (Mahasiswa / Dosen) ───────────────

function PreviewTable({
  result,
  tab,
}: {
  result: PreviewResult
  tab   : TabType
}) {
  const isMahasiswa = tab === 'mahasiswa'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
          isMahasiswa
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
        )}>
          <FileSpreadsheet className="w-3 h-3" />
          {result.total} baris ditemukan
        </div>
        <p className="text-xs text-muted-foreground">
          Menampilkan 5 baris pertama sebagai preview
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-10">No</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">
                  {isMahasiswa ? 'NIM' : 'NIDN'}
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Nama Lengkap</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Program Studi</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.preview.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'transition-colors',
                    row.valid ? 'hover:bg-muted/20' : 'bg-red-500/5 hover:bg-red-500/10'
                  )}
                >
                  <td className="px-3 py-2.5 text-muted-foreground">{row.baris}</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-foreground">{row.nim_nidn || '-'}</td>
                  <td className="px-3 py-2.5 text-foreground">{row.nama_lengkap || '-'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.email || '-'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">{row.program_studi || '-'}</td>
                  <td className="px-3 py-2.5">
                    {row.valid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-semibold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Valid
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-semibold cursor-help"
                        title={row.error ?? ''}
                      >
                        <XCircle className="w-2.5 h-2.5" />
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.preview.some(r => !r.valid) && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Beberapa baris preview mengandung error
            </p>
            <ul className="mt-1 space-y-0.5">
              {result.preview.filter(r => !r.valid).map((r, i) => (
                <li key={i} className="text-[11px] text-red-500 dark:text-red-400">
                  Baris {r.baris}: {r.error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Komponen: Preview Jadwal ──────────────────────────────────

type JadwalFilter = 'semua' | 'baru' | 'warning' | 'error'

function PreviewJadwalTable({ result }: { result: PreviewJadwalResponse }) {
  const [activeFilter, setActiveFilter] = useState<JadwalFilter>('semua')

  const filtered = result.preview.filter(row => {
    if (activeFilter === 'semua') return true
    return row.status === activeFilter
  })

  const filterButtons: { id: JadwalFilter; label: string; count: number }[] = [
    { id: 'semua',   label: 'Semua',   count: result.total },
    { id: 'baru',    label: 'Baru',    count: result.counts.baru },
    { id: 'warning', label: 'Warning', count: result.counts.warning },
    { id: 'error',   label: 'Error',   count: result.counts.error },
  ]

  return (
    <div className="space-y-3">
      {/* Counts summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total Baris',  value: result.total,              color: 'text-foreground',                      bg: 'bg-muted' },
          { label: 'Kelas Baru',   value: result.counts.baru,        color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-500/10' },
          { label: 'Akan Diupdate',value: result.counts.diupdate,    color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-500/10' },
          { label: 'Dosen Warning',value: result.counts.warning,     color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-lg px-3 py-2.5 text-center', s.bg)}>
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border w-fit flex-wrap">
        {filterButtons.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeFilter === f.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            {f.count > 0 && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]',
                f.id === 'error'   ? 'bg-red-500/20 text-red-500' :
                f.id === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                f.id === 'baru'    ? 'bg-green-500/20 text-green-500' :
                                     'bg-muted text-muted-foreground'
              )}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-24">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Kode MK</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Nama MK</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Kelas</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Hari</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Slot</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden xl:table-cell">Jam</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Ruangan</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden xl:table-cell max-w-[140px]">Dosen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground text-xs">
                    Tidak ada data dengan filter ini
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => {
                  const cfg = STATUS_JADWAL_CONFIG[row.status]
                  return (
                    <tr
                      key={idx}
                      className={cn(
                        'transition-colors',
                        row.status === 'error'   ? 'bg-red-500/5 hover:bg-red-500/10' :
                        row.status === 'warning' ? 'bg-amber-500/5 hover:bg-amber-500/10' :
                                                    'hover:bg-muted/20'
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          cfg.color, cfg.bg
                        )}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-foreground">{row.kode_mk || '-'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell truncate max-w-[140px]">
                        {row.nama_mk || '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                          {row.kode_kelas || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.hari || '-'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell font-mono">{row.slot || '-'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden xl:table-cell font-mono whitespace-nowrap">{row.jam || '-'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell font-mono">{row.kode_ruangan || '-'}</td>
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        {row.dosen_matched ? (
                          <span className="text-green-600 dark:text-green-400 truncate max-w-[120px] block" title={row.dosen_matched}>
                            ✓ {row.dosen_matched}
                          </span>
                        ) : row.dosen ? (
                          <span className="text-amber-600 dark:text-amber-400 truncate max-w-[120px] block" title={`Tidak match: ${row.dosen}`}>
                            ? {row.dosen}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {result.preview.length < result.total && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
            <p className="text-[11px] text-muted-foreground">
              Menampilkan {result.preview.length} dari {result.total} baris
            </p>
          </div>
        )}
      </div>

      {/* Warning info */}
      {result.counts.warning > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <strong>{result.counts.warning} baris warning:</strong> Nama dosen di file tidak ditemukan di sistem.
            Kelas tetap akan dibuat tetapi tanpa dosen. Periksa ejaan nama dosen atau assign manual setelah import.
          </p>
        </div>
      )}

      {result.counts.error > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex gap-2">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            <strong>{result.counts.error} baris error:</strong> Kode MK atau kode kelas tidak terdeteksi dari file.
            Baris ini akan dilewati saat import sesungguhnya.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Komponen: Import Result (Mahasiswa/Dosen) ─────────────────

function ImportResultView({
  result,
  tab,
  onReset,
}: {
  result : ImportResult
  tab    : TabType
  onReset: () => void
}) {
  const [showAllErrors, setShowAllErrors] = useState(false)
  const isMahasiswa = tab === 'mahasiswa'
  const allSuccess  = result.gagal === 0
  const allFailed   = result.berhasil === 0

  const errorsToShow = showAllErrors ? result.errors : result.errors.slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{result.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total Baris</p>
        </div>
        <div className={cn(
          'rounded-xl border p-4 text-center',
          result.berhasil > 0 ? 'border-green-500/20 bg-green-500/5' : 'border-border bg-card'
        )}>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.berhasil}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Berhasil Import</p>
        </div>
        <div className={cn(
          'rounded-xl border p-4 text-center',
          result.gagal > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-card'
        )}>
          <p className={cn('text-2xl font-bold', result.gagal > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
            {result.gagal}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Gagal</p>
        </div>
      </div>

      <div className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        allSuccess ? 'border-green-500/20 bg-green-500/5' :
        allFailed  ? 'border-red-500/20 bg-red-500/5' :
                     'border-amber-500/20 bg-amber-500/5'
      )}>
        {allSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        ) : allFailed ? (
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <p className={cn('text-sm font-semibold',
            allSuccess ? 'text-green-700 dark:text-green-300' :
            allFailed  ? 'text-red-700 dark:text-red-300' :
                         'text-amber-700 dark:text-amber-300'
          )}>
            {result.pesan}
          </p>
          {result.berhasil > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.berhasil} {isMahasiswa ? 'mahasiswa' : 'dosen'} berhasil ditambahkan ke sistem.
            </p>
          )}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Baris yang Gagal ({result.errors.length})
          </p>
          <div className="rounded-xl border border-red-500/20 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-red-500/10 bg-red-500/5">
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400 w-16">Baris</th>
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">{isMahasiswa ? 'NIM' : 'NIDN'}</th>
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-500/10">
                {errorsToShow.map((err, idx) => (
                  <tr key={idx} className="hover:bg-red-500/5 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground">{err.baris}</td>
                    <td className="px-3 py-2 font-mono text-foreground">{err.nim ?? err.nidn ?? '-'}</td>
                    <td className="px-3 py-2 text-red-600 dark:text-red-400">{err.pesan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.errors.length > 5 && (
              <div className="px-3 py-2 border-t border-red-500/10 bg-red-500/5">
                <button
                  onClick={() => setShowAllErrors(v => !v)}
                  className="text-[11px] text-red-600 dark:text-red-400 hover:underline"
                >
                  {showAllErrors ? 'Sembunyikan' : `Tampilkan ${result.errors.length - 5} error lainnya`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onReset}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Import Lagi
        </button>
      </div>
    </div>
  )
}

// ── Komponen: Import Jadwal Result ────────────────────────────

function ImportJadwalResultView({
  result,
  onReset,
}: {
  result : ImportJadwalResult
  onReset: () => void
}) {
  const allSuccess = result.error === 0
  const sukses     = result.berhasil + result.diupdate

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Baris',  value: result.total,     color: 'text-foreground',                    bg: 'border-border bg-card' },
          { label: 'Kelas Dibuat', value: result.berhasil,  color: 'text-green-600 dark:text-green-400', bg: 'border-green-500/20 bg-green-500/5' },
          { label: 'Kelas Diupdate',value: result.diupdate, color: 'text-blue-600 dark:text-blue-400',   bg: 'border-blue-500/20 bg-blue-500/5' },
          { label: 'Error',        value: result.error,     color: result.error > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
            bg: result.error > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-card' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl border p-4 text-center', s.bg)}>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Summary banner */}
      <div className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        allSuccess ? 'border-green-500/20 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'
      )}>
        {allSuccess
          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
        <div>
          <p className={cn('text-sm font-semibold',
            allSuccess ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
          )}>
            {result.pesan}
          </p>
          {result.warning > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.warning} kelas dibuat tanpa dosen — cek dan assign dosen secara manual di halaman Matakuliah.
            </p>
          )}
        </div>
      </div>

      {/* Preview kelas berhasil */}
      {result.preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            Contoh Kelas yang Berhasil Diimport
          </p>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-green-500/10">
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400">Kode MK</th>
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400">Kelas</th>
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400 hidden sm:table-cell">Hari</th>
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400 hidden md:table-cell">Jam</th>
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400 hidden lg:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-500/10">
                {result.preview.map((row, idx) => {
                  const cfg = STATUS_JADWAL_CONFIG[row.status]
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono font-bold text-foreground">{row.kode_mk}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                          {row.kode_kelas}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{row.hari || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono hidden md:table-cell">{row.jam || '-'}</td>
                      <td className="px-3 py-2 hidden lg:table-cell">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.color, cfg.bg)}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error list */}
      {result.errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Baris yang Gagal ({result.errors.length})
          </p>
          <div className="rounded-xl border border-red-500/20 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-red-500/10 bg-red-500/5">
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400 w-16">Baris</th>
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">Kode MK</th>
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">Kelas</th>
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-500/10">
                {result.errors.map((err, idx) => (
                  <tr key={idx} className="hover:bg-red-500/5 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground">{err.baris}</td>
                    <td className="px-3 py-2 font-mono text-foreground">{err.kode_mk}</td>
                    <td className="px-3 py-2 font-mono text-foreground">{err.kelas}</td>
                    <td className="px-3 py-2 text-red-600 dark:text-red-400">{err.pesan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onReset}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Import Lagi
        </button>
        {sukses > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground self-center">
            <Info className="w-3.5 h-3.5" />
            Kelas baru tersedia di halaman Matakuliah → Kelola Kelas
          </p>
        )}
      </div>
    </div>
  )
}

// ── Komponen: Panel Mahasiswa / Dosen ─────────────────────────

function ImportUserPanel({ tab }: { tab: 'mahasiswa' | 'dosen' }) {
  const [step, setStep]             = useState<StepType>('upload')
  const [selectedFile, setFile]     = useState<File | null>(null)
  const [previewResult, setPreview] = useState<PreviewResult | null>(null)
  const [importResult, setResult]   = useState<ImportResult | null>(null)

  const isMahasiswa = tab === 'mahasiswa'

  const previewMutation = useMutation({
    mutationFn: (file: File) =>
      isMahasiswa ? previewImportMahasiswa(file) : previewImportDosen(file),
    onSuccess: (data) => { setPreview(data); setStep('preview') },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal membaca file'
      toast.error(msg)
    },
  })

  const qc = useQueryClient()
  const importMutation = useMutation({
    mutationFn: (file: File) =>
      isMahasiswa ? importMahasiswa(file) : importDosen(file),
    onSuccess: (data) => {
      setResult(data)
      setStep('result')
      if (data.berhasil > 0) {
        qc.invalidateQueries({ queryKey: ['admin-mahasiswa'] })
        qc.invalidateQueries({ queryKey: ['admin-dosen'] })
        qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
        toast.success(data.pesan)
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal import'
      toast.error(msg)
    },
  })

  const handleReset = () => {
    setStep('upload'); setFile(null); setPreview(null); setResult(null)
    previewMutation.reset(); importMutation.reset()
  }

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                isMahasiswa ? 'bg-blue-500/10' : 'bg-violet-500/10'
              )}>
                <Download className={cn('w-4 h-4', isMahasiswa ? 'text-blue-500' : 'text-violet-500')} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Langkah 1: Download Template</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Download template Excel, isi data sesuai format, lalu upload kembali.
                </p>
                <button
                  onClick={isMahasiswa ? downloadTemplateMahasiswa : downloadTemplateDosen}
                  className={cn(
                    'mt-2.5 flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white transition-colors',
                    isMahasiswa ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-600 hover:bg-violet-700'
                  )}
                >
                  <Download className="w-3 h-3" />
                  Download Template {isMahasiswa ? 'Mahasiswa' : 'Dosen'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Format Kolom Excel:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                  {[
                    { col: 'A', label: isMahasiswa ? 'NIM *' : 'NIDN *' },
                    { col: 'B', label: 'Nama Lengkap *' },
                    { col: 'C', label: 'Email *' },
                    { col: 'D', label: 'Password *' },
                    { col: 'E', label: 'Program Studi *' },
                    { col: 'F', label: 'Keterangan' },
                  ].map((item) => (
                    <div key={item.col} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.col}</span>
                      <span className="text-[11px] text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">* Wajib diisi · Data mulai baris ke-6</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Langkah 2: Upload File Excel</p>
            <DropzoneUpload
              tab={tab}
              onFileSelected={(f) => { setFile(f); previewMutation.mutate(f) }}
              isLoading={previewMutation.isPending}
            />
          </div>
        </div>
      )}

      {step === 'preview' && previewResult && selectedFile && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30">
            <FileSpreadsheet className={cn('w-5 h-5 flex-shrink-0', isMahasiswa ? 'text-blue-500' : 'text-violet-500')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-muted-foreground">{fmtSize(selectedFile.size)}</p>
            </div>
            <button onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <PreviewTable result={previewResult} tab={tab} />

          <div className="flex gap-2">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Ganti File
            </button>
            <button
              onClick={() => importMutation.mutate(selectedFile)}
              disabled={importMutation.isPending || previewResult.total === 0}
              className={cn(
                'flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60',
                isMahasiswa ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-600 hover:bg-violet-700'
              )}
            >
              {importMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {importMutation.isPending ? 'Mengimport...' : `Mulai Import ${previewResult.total} Baris`}
            </button>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Import akan langsung menyimpan data ke database. NIM/NIDN atau email yang sudah terdaftar akan dilewati.
            </p>
          </div>
        </div>
      )}

      {step === 'result' && importResult && (
        <ImportResultView result={importResult} tab={tab} onReset={handleReset} />
      )}
    </div>
  )
}

// ── Komponen: Panel Import Jadwal ─────────────────────────────

function ImportJadwalPanel() {
  const [step, setStep]             = useState<StepType>('upload')
  const [selectedFile, setFile]     = useState<File | null>(null)
  const [previewResult, setPreview] = useState<PreviewJadwalResponse | null>(null)
  const [importResult, setResult]   = useState<ImportJadwalResult | null>(null)

  const qc = useQueryClient()

  const previewMutation = useMutation({
    mutationFn: (file: File) => previewJadwal(file),
    onSuccess : (data) => { setPreview(data); setStep('preview') },
    onError   : (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Gagal membaca file jadwal. Pastikan format sesuai atau gunakan template.'
      toast.error(msg)
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => importJadwal(file),
    onSuccess : (data) => {
      setResult(data)
      setStep('result')
      if (data.berhasil + data.diupdate > 0) {
        qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
        qc.invalidateQueries({ queryKey: ['kelas'] })
        toast.success(data.pesan)
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal import jadwal'
      toast.error(msg)
    },
  })

  const handleReset = () => {
    setStep('upload'); setFile(null); setPreview(null); setResult(null)
    previewMutation.reset(); importMutation.reset()
  }

  const canImport = previewResult &&
    (previewResult.counts.baru + previewResult.counts.diupdate + previewResult.counts.warning) > 0

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Download template */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Langkah 1: Siapkan File Jadwal</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Gunakan template Excel untuk input manual, atau upload langsung file PDF jadwal kampus.
                </p>
                <button
                  onClick={downloadTemplateJadwal}
                  className="mt-2.5 flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download Template Excel Jadwal
                </button>
              </div>
            </div>
          </div>

          {/* Format info */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-xs font-semibold text-foreground">Format yang Didukung:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-semibold text-foreground">Template Excel (.xlsx)</span>
                    </div>
                    <div className="space-y-0.5">
                      {['A: Hari', 'B: Ruangan *', 'C: Slot (1-3) *', 'D: Kode MK *', 'E: Nama MK', 'F: Dosen', 'G: Kelas *', 'H: Kode Akses'].map(c => (
                        <div key={c} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-muted text-muted-foreground">{c.split(':')[0]}</span>
                          <span className="text-[11px] text-muted-foreground">{c.split(': ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-foreground">PDF Jadwal Kampus</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Parser otomatis mendeteksi tabel jadwal dari PDF. Hasil tergantung format PDF.
                      Gunakan preview untuk memverifikasi sebelum import.
                    </p>
                    <div className="mt-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1.5">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        ⚠ Selalu cek preview — format PDF kampus bervariasi
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">* Wajib diisi · Kolom Hari bisa dikosongkan (carry-over dari baris sebelumnya)</p>
              </div>
            </div>
          </div>

          {/* Info proses */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Cara kerja import jadwal:</p>
              <ol className="text-[11px] text-muted-foreground mt-1.5 space-y-0.5 list-decimal list-inside">
                <li>Matakuliah baru dibuat otomatis jika kode MK belum ada (SKS default 3)</li>
                <li>Ruangan baru dibuat otomatis jika kode ruangan belum ada di sistem</li>
                <li>Dosen dicari via fuzzy match nama — jika tidak match, kelas dibuat tanpa dosen (warning)</li>
                <li>Kelas diupdate jika sudah ada (kombinasi kode MK + kode kelas unik)</li>
              </ol>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Langkah 2: Upload File Jadwal</p>
            <DropzoneUpload
              tab="jadwal"
              onFileSelected={(f) => { setFile(f); previewMutation.mutate(f) }}
              isLoading={previewMutation.isPending}
              acceptPdf={true}
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && previewResult && selectedFile && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30">
            {selectedFile.name.endsWith('.pdf')
              ? <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
              : <FileSpreadsheet className="w-5 h-5 text-amber-500 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-muted-foreground">{fmtSize(selectedFile.size)}</p>
            </div>
            <button onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary message */}
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-sm text-foreground">{previewResult.pesan}</p>
          </div>

          <PreviewJadwalTable result={previewResult} />

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Ganti File
            </button>
            <button
              onClick={() => importMutation.mutate(selectedFile)}
              disabled={importMutation.isPending || !canImport}
              className="flex items-center gap-1.5 h-9 px-5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
            >
              {importMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ArrowRight className="w-3.5 h-3.5" />}
              {importMutation.isPending
                ? 'Mengimport...'
                : `Import ${(previewResult?.counts.baru ?? 0) + (previewResult?.counts.diupdate ?? 0) + (previewResult?.counts.warning ?? 0)} Kelas`}
            </button>
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
              <strong>PENTING:</strong> Operasi ini tidak bisa di-rollback. Pastikan preview sudah sesuai sebelum melanjutkan.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 3: Result ── */}
      {step === 'result' && importResult && (
        <ImportJadwalResultView result={importResult} onReset={handleReset} />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function ImportData() {
  const [activeTab, setActiveTab] = useState<TabType>('mahasiswa')

  const tabConfig: Record<TabType, { title: string; desc: string; icon: React.ReactNode; color: string }> = {
    mahasiswa: {
      title: 'Import Data Mahasiswa',
      desc : 'Tambahkan banyak mahasiswa sekaligus dari file Excel',
      icon : <Users className="w-4.5 h-4.5 text-blue-500" />,
      color: 'bg-blue-500/10',
    },
    dosen: {
      title: 'Import Data Dosen',
      desc : 'Tambahkan banyak dosen sekaligus dari file Excel',
      icon : <GraduationCap className="w-4.5 h-4.5 text-violet-500" />,
      color: 'bg-violet-500/10',
    },
    jadwal: {
      title: 'Import Jadwal Kuliah',
      desc : 'Import jadwal dari PDF atau Excel kampus ke sistem kelas matakuliah',
      icon : <Calendar className="w-4.5 h-4.5 text-amber-500" />,
      color: 'bg-amber-500/10',
    },
  }

  const current = tabConfig[activeTab]

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Data</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Upload file Excel atau PDF untuk menambahkan data secara massal ke sistem.
        </p>
      </div>

      {/* ── Info Banner ────────────────────────────────── */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Panduan import data:</p>
          <ol className="text-xs text-muted-foreground mt-1.5 space-y-0.5 list-decimal list-inside">
            <li>Pilih jenis data yang ingin diimport di bawah (Mahasiswa, Dosen, atau Jadwal)</li>
            <li>Download template Excel sesuai jenis, isi data, lalu upload kembali</li>
            <li>Periksa preview sebelum konfirmasi — data sudah ada tidak akan ditimpa</li>
            <li>Untuk jadwal: bisa upload PDF jadwal kampus atau Excel template</li>
          </ol>
        </div>
      </div>

      {/* ── Tab Switcher ───────────────────────────────── */}
      <TabSwitcher active={activeTab} onChange={(t) => setActiveTab(t)} />

      {/* ── Panel Content ──────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-border">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', current.color)}>
            {current.icon}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{current.title}</h2>
            <p className="text-xs text-muted-foreground">{current.desc}</p>
          </div>
        </div>

        {activeTab === 'mahasiswa' && <ImportUserPanel key="mahasiswa" tab="mahasiswa" />}
        {activeTab === 'dosen'     && <ImportUserPanel key="dosen"     tab="dosen" />}
        {activeTab === 'jadwal'    && <ImportJadwalPanel key="jadwal" />}
      </div>
    </div>
  )
}