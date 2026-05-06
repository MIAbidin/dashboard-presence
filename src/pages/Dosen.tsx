import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Search, Plus, RefreshCw, Edit2, Trash2, KeyRound,
  Eye, EyeOff, ChevronLeft, ChevronRight,
  AlertTriangle, X, Loader2, GraduationCap,
  BookOpen, CheckCircle2, XCircle, ChevronDown,
} from 'lucide-react'
import {
  fetchUsers, createUser, updateUser, deleteUser, resetPassword,
} from '@/api/users.api'
import type { AdminUser } from '@/api/users.api'
import ProdiSelect from '@/components/ProdiSelect'
import { cn } from '@/lib/utils'

// ── Zod Schemas ───────────────────────────────────────────────

const createSchema = z.object({
  nim_nidn      : z.string().min(5, 'NIDN minimal 5 karakter'),
  nama_lengkap  : z.string().min(3, 'Nama minimal 3 karakter'),
  email         : z.string().email('Format email tidak valid'),
  password      : z.string().min(6, 'Password minimal 6 karakter'),
  program_studi : z.string().min(1, 'Program studi wajib dipilih'),
})

const editSchema = z.object({
  nama_lengkap  : z.string().min(3, 'Nama minimal 3 karakter'),
  email         : z.string().email('Format email tidak valid'),
  program_studi : z.string().min(1, 'Program studi wajib dipilih'),
  is_active     : z.boolean(),
})

const resetPwSchema = z.object({
  password_baru      : z.string().min(6, 'Password minimal 6 karakter'),
  konfirmasi_password: z.string(),
}).refine(d => d.password_baru === d.konfirmasi_password, {
  message: 'Password tidak cocok',
  path   : ['konfirmasi_password'],
})

type CreateForm  = z.infer<typeof createSchema>
type EditForm    = z.infer<typeof editSchema>
type ResetPwForm = z.infer<typeof resetPwSchema>

// ── Types ─────────────────────────────────────────────────────

interface KelasItem {
  kelas_id   : string
  kode_kelas : string
  kode_mk    : string
  nama_mk    : string
  hari       : string | null
  jam_range  : string | null
}

// ── Helper Components ─────────────────────────────────────────

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode
  variant : 'success' | 'warning' | 'danger' | 'muted' | 'info'
}) {
  const cls = {
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger : 'bg-red-500/10 text-red-600 dark:text-red-400',
    muted  : 'bg-muted text-muted-foreground',
    info   : 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  }[variant]

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold', cls)}>
      {children}
    </span>
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

// ── Komponen: Kelas Diampu Expandable ─────────────────────────

function KelasDiampuCell({ dosen }: { dosen: AdminUser }) {
  const [expanded, setExpanded] = useState(false)

  const kelasList: KelasItem[] = (dosen as AdminUser & { kelas_list?: KelasItem[] }).kelas_list ?? []
  const hasDetail = kelasList.length > 0

  if (!hasDetail) {
    return dosen.total_mk_diampu > 0 ? (
      <Badge variant="info">
        <BookOpen className="w-2.5 h-2.5" />
        {dosen.total_mk_diampu} MK
      </Badge>
    ) : (
      <Badge variant="muted">
        <BookOpen className="w-2.5 h-2.5" />
        Belum ada
      </Badge>
    )
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
      >
        <BookOpen className="w-2.5 h-2.5" />
        {kelasList.length} Kelas
        <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1 min-w-[180px]">
          {kelasList.map(k => (
            <div key={k.kelas_id} className="flex items-start gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex-shrink-0 mt-0.5">
                {k.kode_kelas}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-foreground leading-tight truncate max-w-[130px]">{k.kode_mk}</p>
                <p className="text-[9px] text-muted-foreground leading-tight truncate max-w-[130px]">{k.nama_mk}</p>
                {(k.hari || k.jam_range) && (
                  <p className="text-[9px] text-muted-foreground/70 leading-tight">
                    {k.hari}{k.hari && k.jam_range ? ' · ' : ''}{k.jam_range}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal: Tambah Dosen ───────────────────────────────────────

function ModalTambah({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { program_studi: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: CreateForm) => createUser({ ...data, role: 'dosen' }),
    onSuccess : res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-dosen'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal membuat akun'
      toast.error(msg)
    },
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-violet-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Tambah Dosen</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">NIDN</label>
            <input
              {...register('nim_nidn')}
              placeholder="0012038901"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nim_nidn ? 'border-destructive' : 'border-border')}
            />
            {errors.nim_nidn && <p className="text-[11px] text-destructive">{errors.nim_nidn.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Program Studi</label>
            <Controller
              name="program_studi"
              control={control}
              render={({ field }) => (
                <ProdiSelect
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.program_studi?.message}
                  placeholder="Pilih Program Studi"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nama Lengkap (beserta gelar)</label>
            <input
              {...register('nama_lengkap')}
              placeholder="Dr. Ir. Budi Santoso, M.T."
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nama_lengkap ? 'border-destructive' : 'border-border')}
            />
            {errors.nama_lengkap && <p className="text-[11px] text-destructive">{errors.nama_lengkap.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="dosen@universitashasanuddin.ac.id"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.email ? 'border-destructive' : 'border-border')}
            />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="min. 6 karakter"
                className={cn('w-full h-9 rounded-lg border bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.password ? 'border-destructive' : 'border-border')}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Batal
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Edit Dosen ─────────────────────────────────────────

function ModalEdit({ dosen, onClose }: { dosen: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, control, formState: { errors } } = useForm<EditForm>({
    resolver     : zodResolver(editSchema),
    defaultValues: {
      nama_lengkap : dosen.nama_lengkap,
      email        : dosen.email,
      program_studi: dosen.program_studi,
      is_active    : dosen.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditForm) => updateUser(dosen.id, data),
    onSuccess : res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-dosen'] })
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
              <h2 className="text-base font-semibold text-foreground">Edit Dosen</h2>
              <p className="text-[11px] text-muted-foreground">{dosen.nim_nidn}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nama Lengkap</label>
            <input
              {...register('nama_lengkap')}
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nama_lengkap ? 'border-destructive' : 'border-border')}
            />
            {errors.nama_lengkap && <p className="text-[11px] text-destructive">{errors.nama_lengkap.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email</label>
            <input
              {...register('email')}
              type="email"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.email ? 'border-destructive' : 'border-border')}
            />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Program Studi</label>
            <Controller
              name="program_studi"
              control={control}
              render={({ field }) => (
                <ProdiSelect
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.program_studi?.message}
                  placeholder="Pilih Program Studi"
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm text-foreground">Status Akun Aktif</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" {...register('is_active')} />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-violet-600 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
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

// ── Modal: Reset Password ─────────────────────────────────────

function ModalResetPassword({ dosen, onClose }: { dosen: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPwForm>({
    resolver: zodResolver(resetPwSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: ResetPwForm) => resetPassword(dosen.id, data.password_baru),
    onSuccess: res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-dosen'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal reset password'
      toast.error(msg)
    },
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Reset Password</h2>
              <p className="text-[11px] text-muted-foreground">{dosen.nama_lengkap}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Password Baru</label>
            <div className="relative">
              <input
                {...register('password_baru')}
                type={showPw ? 'text' : 'password'}
                placeholder="min. 6 karakter"
                className={cn('w-full h-9 rounded-lg border bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring/50', errors.password_baru ? 'border-destructive' : 'border-border')}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password_baru && <p className="text-[11px] text-destructive">{errors.password_baru.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Konfirmasi Password</label>
            <input
              {...register('konfirmasi_password')}
              type={showPw ? 'text' : 'password'}
              placeholder="Ulangi password"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50', errors.konfirmasi_password ? 'border-destructive' : 'border-border')}
            />
            {errors.konfirmasi_password && <p className="text-[11px] text-destructive">{errors.konfirmasi_password.message}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Batal
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Konfirmasi Nonaktifkan ─────────────────────────────

function ModalNonaktifkan({ dosen, onClose }: { dosen: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteUser(dosen.id),
    onSuccess : res => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-dosen'] })
      onClose()
    },
    onError: () => toast.error('Gagal menonaktifkan akun'),
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
        <div className="text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Nonaktifkan Akun?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akun <strong className="text-foreground">{dosen.nama_lengkap}</strong> akan dinonaktifkan.
            Data dan riwayat sesi tetap tersimpan.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Batal
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-9 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Nonaktifkan
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Dropdown Aksi per Baris ───────────────────────────────────

function AksiDropdown({
  dosen, onEdit, onResetPassword, onNonaktifkan,
}: {
  dosen          : AdminUser
  onEdit         : () => void
  onResetPassword: () => void
  onNonaktifkan  : () => void
}) {
  const [open, setOpen] = useState(false)

  const items = [
    { label: 'Edit Data',      icon: <Edit2 className="w-3.5 h-3.5" />,   onClick: onEdit,          color: '',              disabled: false },
    { label: 'Reset Password', icon: <KeyRound className="w-3.5 h-3.5" />, onClick: onResetPassword, color: 'text-blue-500',  disabled: false },
    { label: dosen.is_active ? 'Nonaktifkan' : 'Sudah Nonaktif', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: onNonaktifkan, color: 'text-amber-500', disabled: !dosen.is_active },
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
          <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
            {items.map(item => (
              <button
                key={item.label}
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick() }}
                className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed', item.color || 'text-foreground')}
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
  | { type: 'edit'; dosen: AdminUser }
  | { type: 'reset-password'; dosen: AdminUser }
  | { type: 'nonaktifkan'; dosen: AdminUser }
  | null

export default function Dosen() {
  const [modal, setModal]   = useState<ModalState>(null)
  const [search, setSearch] = useState('')
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
    queryKey: ['admin-dosen', debouncedSearch, page],
    queryFn : () => fetchUsers({ role: 'dosen', search: debouncedSearch || undefined, page, limit: 20 }),
    staleTime: 30_000,
  })

  const closeModal = () => setModal(null)

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dosen</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola data dosen — tambah, edit, reset password, dan nonaktifkan akun.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'tambah' })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Dosen
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari NIDN, nama, atau email..."
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>
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
            {data.total} dosen ditemukan
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">NIDN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Program Studi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kelas Diampu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-muted animate-pulse" style={{ width: j === 2 ? '160px' : j === 0 ? '20px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {debouncedSearch ? `Tidak ada dosen yang cocok dengan "${debouncedSearch}"` : 'Belum ada data dosen'}
                  </td>
                </tr>
              ) : (
                data?.items.map((dosen, idx) => (
                  <tr key={dosen.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-medium text-foreground">{dosen.nim_nidn}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-600/10 border border-violet-600/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-violet-600">{dosen.nama_lengkap[0]?.toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-tight">{dosen.nama_lengkap}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{dosen.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">{dosen.program_studi}</p>
                    </td>
                    <td className="px-4 py-3">
                      <KelasDiampuCell dosen={dosen} />
                    </td>
                    <td className="px-4 py-3">
                      {dosen.is_active ? (
                        <Badge variant="success">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Aktif
                        </Badge>
                      ) : (
                        <Badge variant="muted">
                          <XCircle className="w-2.5 h-2.5" /> Nonaktif
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AksiDropdown
                        dosen={dosen}
                        onEdit         ={() => setModal({ type: 'edit', dosen })}
                        onResetPassword={() => setModal({ type: 'reset-password', dosen })}
                        onNonaktifkan  ={() => setModal({ type: 'nonaktifkan', dosen })}
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
            <p className="text-xs text-muted-foreground">Halaman {page} dari {data.total_pages}</p>
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
                    className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      page === p ? 'bg-violet-600 text-white' : 'border border-border text-muted-foreground hover:bg-muted'
                    )}
                  >{p}</button>
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
      {modal?.type === 'tambah'         && <ModalTambah          onClose={closeModal} />}
      {modal?.type === 'edit'           && <ModalEdit            dosen={modal.dosen} onClose={closeModal} />}
      {modal?.type === 'reset-password' && <ModalResetPassword   dosen={modal.dosen} onClose={closeModal} />}
      {modal?.type === 'nonaktifkan'    && <ModalNonaktifkan     dosen={modal.dosen} onClose={closeModal} />}
    </div>
  )
}