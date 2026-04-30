import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Search, Plus, RefreshCw, Edit2, Trash2, KeyRound,
  ScanFace, Eye, EyeOff, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, XCircle, X, Loader2,
  ShieldCheck, User, Activity,
} from 'lucide-react'
import {
  fetchUsers, createUser, updateUser, deleteUser,
  resetFace, resetPassword, faceDiagnose,
} from '@/api/users.api'
import type { AdminUser, FaceDiagnoseResult } from '@/api/users.api'
import { cn } from '@/lib/utils'

// ── Zod Schemas ───────────────────────────────────────────────

const createSchema = z.object({
  nim_nidn      : z.string().min(5, 'NIM minimal 5 karakter'),
  nama_lengkap  : z.string().min(3, 'Nama minimal 3 karakter'),
  email         : z.string().email('Format email tidak valid'),
  password      : z.string().min(6, 'Password minimal 6 karakter'),
  program_studi : z.string().min(3, 'Program studi wajib diisi'),
})

const editSchema = z.object({
  nama_lengkap  : z.string().min(3, 'Nama minimal 3 karakter'),
  email         : z.string().email('Format email tidak valid'),
  program_studi : z.string().min(3, 'Program studi wajib diisi'),
  is_active     : z.boolean(),
})

const resetPwSchema = z.object({
  password_baru   : z.string().min(6, 'Password minimal 6 karakter'),
  konfirmasi_password: z.string(),
}).refine(d => d.password_baru === d.konfirmasi_password, {
  message: 'Password tidak cocok',
  path: ['konfirmasi_password'],
})

type CreateForm   = z.infer<typeof createSchema>
type EditForm     = z.infer<typeof editSchema>
type ResetPwForm  = z.infer<typeof resetPwSchema>

// ── Helper Components ─────────────────────────────────────────

function Badge({ children, variant }: { children: React.ReactNode; variant: 'success' | 'warning' | 'danger' | 'muted' }) {
  const cls = {
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger : 'bg-red-500/10 text-red-600 dark:text-red-400',
    muted  : 'bg-muted text-muted-foreground',
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

// ── Modal: Tambah Mahasiswa ───────────────────────────────────

function ModalTambah({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: CreateForm) => createUser({ ...data, role: 'mahasiswa' }),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-mahasiswa'] })
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
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Tambah Mahasiswa</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">NIM</label>
              <input {...register('nim_nidn')} placeholder="H071211099"
                className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nim_nidn ? 'border-destructive' : 'border-border')} />
              {errors.nim_nidn && <p className="text-[11px] text-destructive">{errors.nim_nidn.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Program Studi</label>
              <input {...register('program_studi')} placeholder="Teknik Informatika"
                className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.program_studi ? 'border-destructive' : 'border-border')} />
              {errors.program_studi && <p className="text-[11px] text-destructive">{errors.program_studi.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nama Lengkap</label>
            <input {...register('nama_lengkap')} placeholder="Muhammad Rizky Pratama"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nama_lengkap ? 'border-destructive' : 'border-border')} />
            {errors.nama_lengkap && <p className="text-[11px] text-destructive">{errors.nama_lengkap.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email</label>
            <input {...register('email')} type="email" placeholder="mahasiswa@student.ac.id"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.email ? 'border-destructive' : 'border-border')} />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Password</label>
            <div className="relative">
              <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="min. 6 karakter"
                className={cn('w-full h-9 rounded-lg border bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.password ? 'border-destructive' : 'border-border')} />
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

// ── Modal: Edit Mahasiswa ─────────────────────────────────────

function ModalEdit({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nama_lengkap  : user.nama_lengkap,
      email         : user.email,
      program_studi : user.program_studi,
      is_active     : user.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditForm) => updateUser(user.id, data),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-mahasiswa'] })
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
              <h2 className="text-base font-semibold text-foreground">Edit Mahasiswa</h2>
              <p className="text-[11px] text-muted-foreground">{user.nim_nidn}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nama Lengkap</label>
            <input {...register('nama_lengkap')}
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.nama_lengkap ? 'border-destructive' : 'border-border')} />
            {errors.nama_lengkap && <p className="text-[11px] text-destructive">{errors.nama_lengkap.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email</label>
            <input {...register('email')} type="email"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.email ? 'border-destructive' : 'border-border')} />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Program Studi</label>
            <input {...register('program_studi')}
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all', errors.program_studi ? 'border-destructive' : 'border-border')} />
            {errors.program_studi && <p className="text-[11px] text-destructive">{errors.program_studi.message}</p>}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm text-foreground">Status Akun Aktif</span>
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

// ── Modal: Reset Password ─────────────────────────────────────

function ModalResetPassword({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPwForm>({
    resolver: zodResolver(resetPwSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: ResetPwForm) => resetPassword(user.id, data.password_baru),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-mahasiswa'] })
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
              <p className="text-[11px] text-muted-foreground">{user.nama_lengkap}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Password Baru</label>
            <div className="relative">
              <input {...register('password_baru')} type={showPw ? 'text' : 'password'} placeholder="min. 6 karakter"
                className={cn('w-full h-9 rounded-lg border bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring/50', errors.password_baru ? 'border-destructive' : 'border-border')} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password_baru && <p className="text-[11px] text-destructive">{errors.password_baru.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Konfirmasi Password</label>
            <input {...register('konfirmasi_password')} type={showPw ? 'text' : 'password'} placeholder="Ulangi password"
              className={cn('w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50', errors.konfirmasi_password ? 'border-destructive' : 'border-border')} />
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

// ── Modal: Konfirmasi Reset Wajah ─────────────────────────────

function ModalResetWajah({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => resetFace(user.id),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-mahasiswa'] })
      onClose()
    },
    onError: () => toast.error('Gagal reset data wajah'),
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
        <div className="text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <ScanFace className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Reset Data Wajah?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Semua data wajah <strong className="text-foreground">{user.nama_lengkap}</strong> ({user.total_foto_wajah} foto) akan dihapus permanen.
            Mahasiswa harus registrasi ulang untuk bisa presensi.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Batal
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Ya, Hapus
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Konfirmasi Nonaktifkan ─────────────────────────────

function ModalNonaktifkan({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-mahasiswa'] })
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
            Akun <strong className="text-foreground">{user.nama_lengkap}</strong> akan dinonaktifkan.
            Data presensi tetap tersimpan dan akun bisa diaktifkan kembali.
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

// ── Modal: Face Diagnose ──────────────────────────────────────

function ModalFaceDiagnose({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['face-diagnose', user.id],
    queryFn : () => faceDiagnose(user.id),
  })

  const warnaCls = (warna: string) => ({
    green : 'text-green-500 bg-green-500/10',
    blue  : 'text-blue-500 bg-blue-500/10',
    amber : 'text-amber-500 bg-amber-500/10',
    red   : 'text-red-500 bg-red-500/10',
  }[warna] ?? 'text-muted-foreground bg-muted')

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Face Diagnose</h2>
              <p className="text-[11px] text-muted-foreground">{user.nama_lengkap} · {user.nim_nidn}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Menganalisis data wajah...</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <XCircle className="w-6 h-6 text-destructive" />
              <p className="text-sm text-muted-foreground">Gagal memuat data diagnosa</p>
            </div>
          )}

          {data && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{data.total_embeddings}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Foto Terdaftar</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{data.threshold_aktif}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Threshold</p>
                </div>
                <div className={cn('rounded-xl border p-3 text-center', data.is_face_registered ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5')}>
                  {data.is_face_registered
                    ? <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                    : <XCircle className="w-6 h-6 text-red-500 mx-auto" />
                  }
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {data.is_face_registered ? 'Terdaftar' : 'Belum Terdaftar'}
                  </p>
                </div>
              </div>

              {/* Jika belum ada data */}
              {data.total_embeddings === 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    {data.status ?? 'Belum ada data wajah'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Konsistensi Internal */}
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Konsistensi Internal
                      </h3>
                      <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full',
                        warnaCls(data.konsistensi_internal.warna))}>
                        {data.konsistensi_internal.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Rata-rata Jarak</p>
                        <p className="text-sm font-bold text-foreground">{data.konsistensi_internal.rata_rata_jarak}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Jarak Maksimum</p>
                        <p className="text-sm font-bold text-foreground">{data.konsistensi_internal.jarak_maksimum}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {data.konsistensi_internal.keterangan}
                    </p>
                    {/* Progress bar visual */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0.0 (Identik)</span>
                        <span>1.0 (Threshold)</span>
                        <span>2.0 (Beda)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full relative">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500"
                          style={{ width: `${Math.min(data.konsistensi_internal.rata_rata_jarak / 2 * 100, 100)}%` }}
                        />
                        {/* Threshold marker */}
                        <div className="absolute top-0 h-2 w-0.5 bg-foreground/50" style={{ left: '45%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Daftar embedding */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                      <h3 className="text-xs font-semibold text-foreground">Detail Embedding ({data.total_embeddings} foto)</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {data.embeddings.map((emb) => (
                        <div key={emb.foto_index} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">Foto #{emb.foto_index}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              {emb.embedding_id}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground flex-shrink-0">
                            {emb.created_at ? new Date(emb.created_at).toLocaleDateString('id-ID') : '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Rekomendasi */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Rekomendasi
                </h3>
                <ul className="space-y-1.5">
                  {data.rekomendasi.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex-shrink-0">
          <button onClick={onClose}
            className="w-full h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Dropdown Aksi per Baris ───────────────────────────────────

function AksiDropdown({
  user,
  onEdit, onResetWajah, onResetPassword, onDiagnose, onNonaktifkan,
}: {
  user             : AdminUser
  onEdit           : () => void
  onResetWajah     : () => void
  onResetPassword  : () => void
  onDiagnose       : () => void
  onNonaktifkan    : () => void
}) {
  const [open, setOpen] = useState(false)

  const items = [
    { label: 'Edit Data',       icon: <Edit2 className="w-3.5 h-3.5" />,    onClick: onEdit,          color: '' },
    { label: 'Reset Password',  icon: <KeyRound className="w-3.5 h-3.5" />, onClick: onResetPassword, color: 'text-blue-500' },
    { label: 'Face Diagnose',   icon: <Activity className="w-3.5 h-3.5" />, onClick: onDiagnose,      color: 'text-violet-500' },
    { label: 'Reset Wajah',     icon: <ScanFace className="w-3.5 h-3.5" />, onClick: onResetWajah,    color: 'text-red-500' },
    { label: user.is_active ? 'Nonaktifkan' : 'Sudah Nonaktif', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: onNonaktifkan, color: 'text-amber-500', disabled: !user.is_active },
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
            {items.map((item) => (
              <button
                key={item.label}
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick() }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                  item.color || 'text-foreground'
                )}
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
  | { type: 'edit'; user: AdminUser }
  | { type: 'reset-password'; user: AdminUser }
  | { type: 'reset-wajah'; user: AdminUser }
  | { type: 'diagnose'; user: AdminUser }
  | { type: 'nonaktifkan'; user: AdminUser }
  | null

export default function Mahasiswa() {
  const [modal, setModal]   = useState<ModalState>(null)
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    clearTimeout((handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }, [])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-mahasiswa', debouncedSearch, page],
    queryFn : () => fetchUsers({ role: 'mahasiswa', search: debouncedSearch || undefined, page, limit: 20 }),
    staleTime: 30_000,
  })

  const closeModal = () => setModal(null)

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mahasiswa</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola data mahasiswa, reset wajah, dan diagnosa face recognition.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'tambah' })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Mahasiswa
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari NIM, nama, atau email..."
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
            {data.total} mahasiswa ditemukan
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">NIM</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Program Studi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status Wajah</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status Akun</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-muted animate-pulse" style={{ width: j === 2 ? '140px' : j === 0 ? '20px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {debouncedSearch ? `Tidak ada mahasiswa yang cocok dengan "${debouncedSearch}"` : 'Belum ada data mahasiswa'}
                  </td>
                </tr>
              ) : (
                data?.items.map((mhs, idx) => (
                  <tr key={mhs.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(page - 1) * 20 + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-medium text-foreground">{mhs.nim_nidn}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{mhs.nama_lengkap}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{mhs.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">{mhs.program_studi}</p>
                    </td>
                    <td className="px-4 py-3">
                      {mhs.is_face_registered ? (
                        <Badge variant="success">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Terdaftar ({mhs.total_foto_wajah})
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <XCircle className="w-2.5 h-2.5" />
                          Belum
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mhs.is_active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="muted">Nonaktif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AksiDropdown
                        user={mhs}
                        onEdit          ={() => setModal({ type: 'edit', user: mhs })}
                        onResetPassword ={() => setModal({ type: 'reset-password', user: mhs })}
                        onDiagnose      ={() => setModal({ type: 'diagnose', user: mhs })}
                        onResetWajah    ={() => setModal({ type: 'reset-wajah', user: mhs })}
                        onNonaktifkan   ={() => setModal({ type: 'nonaktifkan', user: mhs })}
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
      {modal?.type === 'edit'           && <ModalEdit            user={modal.user} onClose={closeModal} />}
      {modal?.type === 'reset-password' && <ModalResetPassword   user={modal.user} onClose={closeModal} />}
      {modal?.type === 'reset-wajah'    && <ModalResetWajah      user={modal.user} onClose={closeModal} />}
      {modal?.type === 'nonaktifkan'    && <ModalNonaktifkan     user={modal.user} onClose={closeModal} />}
      {modal?.type === 'diagnose'       && <ModalFaceDiagnose    user={modal.user} onClose={closeModal} />}
    </div>
  )
}