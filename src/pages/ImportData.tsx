import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Upload, Download, CheckCircle2, XCircle, AlertTriangle,
  FileSpreadsheet, Loader2, RefreshCw, Users, GraduationCap,
  Info, X, Eye, ArrowRight, RotateCcw,
} from 'lucide-react'
import {
  previewImportMahasiswa, previewImportDosen,
  importMahasiswa, importDosen,
  downloadTemplateMahasiswa, downloadTemplateDosen,
} from '@/api/import.api'
import type { PreviewResult, ImportResult } from '@/api/import.api'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────

type TabType  = 'mahasiswa' | 'dosen'
type StepType = 'upload' | 'preview' | 'result'

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
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
      {([
        { id: 'mahasiswa', label: 'Import Mahasiswa', icon: <Users className="w-4 h-4" /> },
        { id: 'dosen',     label: 'Import Dosen',     icon: <GraduationCap className="w-4 h-4" /> },
      ] as { id: TabType; label: string; icon: React.ReactNode }[]).map((tab) => (
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
}: {
  tab           : TabType
  onFileSelected: (file: File) => void
  isLoading     : boolean
}) {
  const inputRef     = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const isMahasiswa  = tab === 'mahasiswa'

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Hanya file Excel (.xlsx / .xls) yang diizinkan')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }
    onFileSelected(file)
  }, [onFileSelected])

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
        accept=".xlsx,.xls"
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
          <p className="text-sm text-muted-foreground">Membaca file Excel...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center',
            isMahasiswa ? 'bg-blue-500/10' : 'bg-violet-500/10'
          )}>
            <FileSpreadsheet className={cn(
              'w-8 h-8',
              isMahasiswa ? 'text-blue-500' : 'text-violet-500'
            )} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Drag & drop file Excel di sini
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              atau klik untuk memilih file (.xlsx, .xls, maks 5MB)
            </p>
          </div>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isMahasiswa
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-violet-600 text-white hover:bg-violet-700'
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

// ── Komponen: Preview Table ───────────────────────────────────

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
      {/* Info badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
          isMahasiswa ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
        )}>
          <FileSpreadsheet className="w-3 h-3" />
          {result.total} baris ditemukan
        </div>
        <p className="text-xs text-muted-foreground">
          Menampilkan 5 baris pertama sebagai preview
        </p>
      </div>

      {/* Tabel preview */}
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

      {/* Error rows in preview */}
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

// ── Komponen: Import Result ───────────────────────────────────

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
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{result.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total Baris</p>
        </div>
        <div className={cn(
          'rounded-xl border p-4 text-center',
          result.berhasil > 0
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-border bg-card'
        )}>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {result.berhasil}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Berhasil Import</p>
        </div>
        <div className={cn(
          'rounded-xl border p-4 text-center',
          result.gagal > 0
            ? 'border-red-500/20 bg-red-500/5'
            : 'border-border bg-card'
        )}>
          <p className={cn(
            'text-2xl font-bold',
            result.gagal > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
          )}>
            {result.gagal}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Gagal</p>
        </div>
      </div>

      {/* Status banner */}
      <div className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        allSuccess  ? 'border-green-500/20 bg-green-500/5' :
        allFailed   ? 'border-red-500/20 bg-red-500/5' :
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
          <p className={cn(
            'text-sm font-semibold',
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

      {/* Preview data yang berhasil */}
      {result.preview.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Contoh Data yang Berhasil Diimport
            </p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-green-500/10">
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400">
                    {isMahasiswa ? 'NIM' : 'NIDN'}
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400">Nama</th>
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400 hidden md:table-cell">Email</th>
                  <th className="text-left px-3 py-2 font-semibold text-green-700 dark:text-green-400 hidden lg:table-cell">Program Studi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-500/10">
                {result.preview.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-mono text-foreground">{row.nim_nidn}</td>
                    <td className="px-3 py-2 text-foreground">{row.nama_lengkap}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{row.email}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">{row.program_studi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error list */}
      {result.errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Baris yang Gagal ({result.errors.length})
            </p>
          </div>
          <div className="rounded-xl border border-red-500/20 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-red-500/10 bg-red-500/5">
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400 w-16">Baris</th>
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">
                    {isMahasiswa ? 'NIM' : 'NIDN'}
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">Alasan Gagal</th>
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
                  {showAllErrors
                    ? 'Sembunyikan'
                    : `Tampilkan ${result.errors.length - 5} error lainnya`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onReset}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Import Lagi
        </button>
        {result.gagal > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            Perbaiki baris yang error di file Excel, lalu upload ulang.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Komponen: Panel per tab ───────────────────────────────────

function ImportPanel({ tab }: { tab: TabType }) {
  const [step, setStep]             = useState<StepType>('upload')
  const [selectedFile, setFile]     = useState<File | null>(null)
  const [previewResult, setPreview] = useState<PreviewResult | null>(null)
  const [importResult, setResult]   = useState<ImportResult | null>(null)

  const isMahasiswa = tab === 'mahasiswa'

  // ── Mutation: preview ──────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: (file: File) =>
      isMahasiswa ? previewImportMahasiswa(file) : previewImportDosen(file),
    onSuccess: (data) => {
      setPreview(data)
      setStep('preview')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Gagal membaca file Excel'
      toast.error(msg)
    },
  })

  // ── Mutation: import ───────────────────────────────────────
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
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Gagal melakukan import'
      toast.error(msg)
    },
  })

  const handleFileSelected = (file: File) => {
    setFile(file)
    previewMutation.mutate(file)
  }

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setResult(null)
    previewMutation.reset()
    importMutation.reset()
  }

  const handleConfirmImport = () => {
    if (!selectedFile) return
    importMutation.mutate(selectedFile)
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <StepIndicator step={step} />

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Panduan download template */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                isMahasiswa ? 'bg-blue-500/10' : 'bg-violet-500/10'
              )}>
                <Download className={cn('w-4 h-4', isMahasiswa ? 'text-blue-500' : 'text-violet-500')} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Langkah 1: Download Template
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Download template Excel, isi data sesuai format, lalu upload kembali.
                  Jangan ubah nama kolom header.
                </p>
                <button
                  onClick={isMahasiswa ? downloadTemplateMahasiswa : downloadTemplateDosen}
                  className={cn(
                    'mt-2.5 flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors',
                    isMahasiswa
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-violet-600 text-white hover:bg-violet-700'
                  )}
                >
                  <Download className="w-3 h-3" />
                  Download Template {isMahasiswa ? 'Mahasiswa' : 'Dosen'}
                </button>
              </div>
            </div>
          </div>

          {/* Info format */}
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
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.col}
                      </span>
                      <span className="text-[11px] text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  * Wajib diisi · Data mulai baris ke-6 (baris 4 = header, 5 = contoh)
                </p>
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">
              Langkah 2: Upload File Excel
            </p>
            <DropzoneUpload
              tab={tab}
              onFileSelected={handleFileSelected}
              isLoading={previewMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && previewResult && selectedFile && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30">
            <FileSpreadsheet className={cn(
              'w-5 h-5 flex-shrink-0',
              isMahasiswa ? 'text-blue-500' : 'text-violet-500'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-muted-foreground">{fmtSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Ganti file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview tabel */}
          <PreviewTable result={previewResult} tab={tab} />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ganti File
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importMutation.isPending || previewResult.total === 0}
              className={cn(
                'flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60',
                isMahasiswa
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              )}
            >
              {importMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              {importMutation.isPending
                ? 'Mengimport...'
                : `Mulai Import ${previewResult.total} Baris`}
            </button>
          </div>

          {/* Peringatan */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Import akan langsung menyimpan data ke database. NIM/NIDN atau email yang sudah terdaftar
              akan dilewati (tidak ditimpa). Pastikan data sudah benar sebelum melanjutkan.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 3: Result ── */}
      {step === 'result' && importResult && (
        <ImportResultView
          result={importResult}
          tab={tab}
          onReset={handleReset}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function ImportData() {
  const [activeTab, setActiveTab] = useState<TabType>('mahasiswa')

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Data</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Upload file Excel untuk menambahkan banyak mahasiswa atau dosen sekaligus.
        </p>
      </div>

      {/* ── Info Banner ────────────────────────────────── */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Cara menggunakan fitur import:</p>
          <ol className="text-xs text-muted-foreground mt-1.5 space-y-0.5 list-decimal list-inside">
            <li>Download template Excel sesuai tipe data (mahasiswa / dosen)</li>
            <li>Isi data di template — jangan ubah nama kolom header</li>
            <li>Upload file Excel yang sudah diisi</li>
            <li>Periksa preview 5 baris pertama, lalu konfirmasi import</li>
            <li>Data yang sudah ada (NIM/NIDN atau email sama) akan dilewati otomatis</li>
          </ol>
        </div>
      </div>

      {/* ── Tab Switcher ───────────────────────────────── */}
      <TabSwitcher active={activeTab} onChange={handleTabChange} />

      {/* ── Panel Content ──────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-border">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            activeTab === 'mahasiswa' ? 'bg-blue-500/10' : 'bg-violet-500/10'
          )}>
            {activeTab === 'mahasiswa'
              ? <Users className="w-4.5 h-4.5 text-blue-500" />
              : <GraduationCap className="w-4.5 h-4.5 text-violet-500" />
            }
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {activeTab === 'mahasiswa' ? 'Import Data Mahasiswa' : 'Import Data Dosen'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'mahasiswa'
                ? 'Tambahkan banyak mahasiswa sekaligus dari file Excel'
                : 'Tambahkan banyak dosen sekaligus dari file Excel'}
            </p>
          </div>
        </div>

        {/* Render panel — key memastikan state reset saat ganti tab */}
        <ImportPanel key={activeTab} tab={activeTab} />
      </div>
    </div>
  )
}