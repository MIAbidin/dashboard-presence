// src/pages/ProgramStudi.tsx
// Fase D — Halaman Manajemen Program Studi
// Konsisten dengan pola halaman Ruangan / Mahasiswa / Dosen

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Search, Plus, RefreshCw, Edit2, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle,
  X, Loader2, GraduationCap, Users, BookOpen,
  CheckCircle2, XCircle, Building2,
} from 'lucide-react'
import {
  fetchProgramStudi,
  fetchProgramStudiStats,
  createProgramStudi,
  updateProgramStudi,
  deleteProgramStudi,
  toggleProgramStudi,
} from '@/api/program_studi.api'
import type { ProgramStudi } from '@/api/program_studi.api'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────

const JENJANG_OPTIONS = ['D3', 'D4', 'S1', 'S2', 'S3'] as const

const JENJANG_BADGE: Record<string, string> = {
  S1: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  S2: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  S3: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  D3: 'bg-green-500/10 text-green-600 dark:text-green-400',
  D4: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
}

// ── Zod Schemas ───────────────────────────────────────────────

const createSchema = z.object({
  kode    : z.string().min(2, 'Kode minimal 2 karakter').max(10),
  nama    : z.string().min(3, 'Nama minimal 3 karakter'),
  fakultas: z.string().optional(),
  jenjang : z.string().optional(),
})

const editSchema = z.object({
  kode    : z.string().min(2, 'Kode minimal 2 karakter').max(10),
  nama    : z.string().min(3, 'Nama minimal 3 karakter'),
  fakultas: z.string().optional(),
  jenjang : z.string().optional(),
  is_active: z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>

// ── Helper Components ─────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

// ── Modal: Tambah Program Studi ───────────────────────────────

function ModalTambah({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const mutation = useMutation({
    mutationFn: createProgramStudi,
    onSuccess : res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-program-studi'] })
      qc.invalidateQueries({ queryKey: ['program-studi-stats'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal membuat program studi'
      toast.error(msg)
    },
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Tambah Program Studi</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Kode *</label>
              <input
                {...register('kode')}
                placeholder="TIF"
                className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all uppercase', errors.kode ? 'border-destructive' : 'border-border')}
              />
              {errors.kode && <p className="text-[11px] text-destructive">{errors.kode.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Jenjang</label>
              <select
                {...register('jenjang')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
              >
                <option value="">— Pilih —</option>
                {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nama Program Studi *</label>
            <input
              {...register('nama')}
              placeholder="Teknik Informatika"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nama ? 'border-destructive' : 'border-border')}
            />
            {errors.nama && <p className="text-[11px] text-destructive">{errors.nama.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Fakultas</label>
            <input
              {...register('fakultas')}
              placeholder="Fakultas Komunikasi dan Informatika"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Batal
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Edit Program Studi ─────────────────────────────────

function ModalEdit({ prodi, onClose }: { prodi: ProgramStudi; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      kode    : prodi.kode,
      nama    : prodi.nama,
      fakultas: prodi.fakultas ?? '',
      jenjang : prodi.jenjang  ?? '',
      is_active: prodi.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditForm) => updateProgramStudi(prodi.id, data),
    onSuccess : res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-program-studi'] })
      qc.invalidateQueries({ queryKey: ['program-studi-stats'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal update'
      toast.error(msg)
    },
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Edit Program Studi</h2>
              <p className="text-[11px] text-muted-foreground">{prodi.kode}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Kode *</label>
              <input
                {...register('kode')}
                className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all uppercase', errors.kode ? 'border-destructive' : 'border-border')}
              />
              {errors.kode && <p className="text-[11px] text-destructive">{errors.kode.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Jenjang</label>
              <select
                {...register('jenjang')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
              >
                <option value="">— Pilih —</option>
                {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nama Program Studi *</label>
            <input
              {...register('nama')}
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nama ? 'border-destructive' : 'border-border')}
            />
            {errors.nama && <p className="text-[11px] text-destructive">{errors.nama.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Fakultas</label>
            <input
              {...register('fakultas')}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm text-foreground">Status Aktif</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" {...register('is_active')} />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Batal
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Konfirmasi Hapus ───────────────────────────────────

function ModalHapus({ prodi, onClose }: { prodi: ProgramStudi; onClose: () => void }) {
  const qc = useQueryClient()
  const totalUser = prodi.jumlah_mahasiswa + prodi.jumlah_dosen

  const mutation = useMutation({
    mutationFn: () => deleteProgramStudi(prodi.id),
    onSuccess : res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-program-studi'] })
      qc.invalidateQueries({ queryKey: ['program-studi-stats'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal menghapus'
      toast.error(msg)
    },
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
        <div className="text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Hapus Program Studi?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Yakin ingin menghapus <strong className="text-foreground">{prodi.kode} — {prodi.nama}</strong>?
          </p>
          {totalUser > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-left">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Masih ada <strong>{prodi.jumlah_mahasiswa} mahasiswa</strong> dan <strong>{prodi.jumlah_dosen} dosen</strong> aktif di prodi ini.
                Pindahkan atau nonaktifkan mereka terlebih dahulu.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Batal
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || totalUser > 0}
            className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Dropdown Aksi ─────────────────────────────────────────────

function AksiDropdown({
  prodi, onEdit, onHapus,
}: {
  prodi: ProgramStudi; onEdit: () => void; onHapus: () => void
}) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: () => toggleProgramStudi(prodi.id, !prodi.is_active),
    onSuccess : res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-program-studi'] })
      qc.invalidateQueries({ queryKey: ['program-studi-stats'] })
    },
    onError: () => toast.error('Gagal mengubah status'),
  })

  const items = [
    { label: 'Edit',    icon: <Edit2 className="w-3.5 h-3.5" />,  onClick: onEdit,  color: '' },
    { label: prodi.is_active ? 'Nonaktifkan' : 'Aktifkan', icon: prodi.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />, onClick: () => toggleMutation.mutate(), color: prodi.is_active ? 'text-amber-500' : 'text-green-500' },
    { label: 'Hapus',  icon: <Trash2 className="w-3.5 h-3.5" />,  onClick: onHapus, color: 'text-red-500' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="h-7 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        Aksi
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
            {items.map(item => (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.onClick() }}
                className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors', item.color || 'text-foreground')}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

type ModalState =
  | { type: 'tambah' }
  | { type: 'edit'; prodi: ProgramStudi }
  | { type: 'hapus'; prodi: ProgramStudi }
  | null

export default function ProgramStudiPage() {
  const [modal, setModal]   = useState<ModalState>(null)
  const [search, setSearch] = useState('')
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [page, setPage]     = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    clearTimeout((handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }, [])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-program-studi', debouncedSearch, filterJenjang, page],
    queryFn : () => fetchProgramStudi({
      search : debouncedSearch || undefined,
      jenjang: filterJenjang !== 'semua' ? filterJenjang : undefined,
      page,
      limit  : 20,
    }),
    staleTime: 30_000,
  })

  const { data: stats } = useQuery({
    queryKey: ['program-studi-stats'],
    queryFn : fetchProgramStudiStats,
    staleTime: 60_000,
  })

  const closeModal = () => setModal(null)

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Program Studi</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola daftar program studi — tambah, edit, dan nonaktifkan.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'tambah' })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Prodi
        </button>
      </div>

      {/* ── Stat Strip ─────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Prodi"    value={stats.total}  icon={GraduationCap} color="bg-primary/10 text-primary" />
          <StatCard label="Aktif"          value={stats.aktif}  icon={CheckCircle2}  color="bg-green-500/10 text-green-500" />
          <StatCard label="Jenjang S1"     value={stats.s1}     icon={BookOpen}      color="bg-blue-500/10 text-blue-500" />
          <StatCard label="Jenjang D3"     value={stats.d3}     icon={Building2}     color="bg-teal-500/10 text-teal-500" />
          <StatCard label="Jenjang D4"     value={stats.d4}     icon={Building2}     color="bg-cyan-500/10 text-cyan-500" />
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari kode, nama, atau fakultas..."
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>

        {/* Filter jenjang */}
        <select
          value={filterJenjang}
          onChange={e => { setFilterJenjang(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
        >
          <option value="semua">Semua Jenjang</option>
          {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
        </select>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>

        {data && (
          <p className="text-xs text-muted-foreground ml-auto">
            {data.total} program studi ditemukan
          </p>
        )}
      </div>

      {/* ── Tabel ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-10">No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Fakultas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Jenjang</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Mahasiswa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Dosen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-muted animate-pulse" style={{ width: j === 2 ? '160px' : j === 0 ? '20px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {debouncedSearch
                      ? `Tidak ada program studi yang cocok dengan "${debouncedSearch}"`
                      : 'Belum ada data program studi'}
                  </td>
                </tr>
              ) : (
                data?.items.map((prodi, idx) => (
                  <tr key={prodi.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(page - 1) * 20 + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
                        {prodi.kode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{prodi.nama}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {prodi.fakultas ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {prodi.jenjang ? (
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold', JENJANG_BADGE[prodi.jenjang] ?? 'bg-muted text-muted-foreground')}>
                          {prodi.jenjang}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {prodi.jumlah_mahasiswa}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <GraduationCap className="w-3 h-3" />
                        {prodi.jumlah_dosen}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {prodi.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground">
                          <XCircle className="w-2.5 h-2.5" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AksiDropdown
                        prodi={prodi}
                        onEdit  ={() => setModal({ type: 'edit', prodi })}
                        onHapus ={() => setModal({ type: 'hapus', prodi })}
                      />
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
              Halaman {page} dari {data.total_pages}
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
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-colors',
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

      {/* ── Modals ─────────────────────────────────────── */}
      {modal?.type === 'tambah' && <ModalTambah onClose={closeModal} />}
      {modal?.type === 'edit'   && <ModalEdit   prodi={modal.prodi} onClose={closeModal} />}
      {modal?.type === 'hapus'  && <ModalHapus  prodi={modal.prodi} onClose={closeModal} />}
    </div>
  )
}