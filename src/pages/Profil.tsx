import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  User, KeyRound, Eye, EyeOff, Loader2,
  CheckCircle2, Shield, Mail, BookOpen,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { gantiPassword } from '@/api/scheduler.api'
import { cn } from '@/lib/utils'

// ── Schema ────────────────────────────────────────────────────

const pwSchema = z.object({
  password_lama : z.string().min(1, 'Password lama wajib diisi'),
  password_baru : z.string().min(6, 'Password baru minimal 6 karakter'),
  konfirmasi    : z.string().min(1, 'Konfirmasi wajib diisi'),
}).refine(d => d.password_baru === d.konfirmasi, {
  message: 'Konfirmasi password tidak cocok',
  path   : ['konfirmasi'],
})

type PwForm = z.infer<typeof pwSchema>

// ── Komponen: Info Row ────────────────────────────────────────

function InfoRow({ label, value, icon }: { label: string; value?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value ?? '—'}</p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function Profil() {
  const user = useAuthStore((s) => s.user)
  const [showForm, setShowForm] = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [success, setSuccess]   = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  })

  const mutation = useMutation({
    mutationFn: gantiPassword,
    onSuccess : (res) => {
      toast.success(res.message)
      setSuccess(true)
      setShowForm(false)
      reset()
      // Reset success setelah 5 detik
      setTimeout(() => setSuccess(false), 5000)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Gagal mengubah password'
      toast.error(msg)
    },
  })

  const inputCls = (hasError?: boolean) => cn(
    'w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none',
    'focus:ring-2 focus:ring-ring/50 transition-all',
    hasError ? 'border-destructive' : 'border-border hover:border-ring/30'
  )

  return (
    <div className="p-6 space-y-6 animate-in max-w-2xl">
      {/* ── Header ─────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profil Saya</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Informasi akun administrator yang sedang login.
        </p>
      </div>

      {/* ── Avatar + Nama ───────────────────────────────── */}
      <div className="flex items-center gap-5 p-5 rounded-2xl border border-border bg-card">
        {/* Avatar besar */}
        <div className="w-16 h-16 rounded-2xl bg-navy-800 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-2xl font-bold">
            {user?.nama_lengkap?.[0]?.toUpperCase() ?? 'A'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">
            {user?.nama_lengkap ?? 'Admin'}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.nim_nidn}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-800/10 text-navy-800 dark:text-navy-200 dark:bg-navy-800/30 text-[10px] font-bold uppercase tracking-wider">
              <Shield className="w-2.5 h-2.5" />
              Administrator
            </span>
          </div>
        </div>
      </div>

      {/* ── Info Detail ─────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground">Informasi Akun</h3>
        </div>
        <div className="px-5">
          <InfoRow
            label="Nama Lengkap"
            value={user?.nama_lengkap}
            icon={<User className="w-4 h-4 text-muted-foreground" />}
          />
          <InfoRow
            label="NIM / NIDN"
            value={user?.nim_nidn}
            icon={<Shield className="w-4 h-4 text-muted-foreground" />}
          />
          <InfoRow
            label="Email"
            value={user?.email}
            icon={<Mail className="w-4 h-4 text-muted-foreground" />}
          />
          <InfoRow
            label="Program Studi"
            value={user?.program_studi}
            icon={<BookOpen className="w-4 h-4 text-muted-foreground" />}
          />
          <InfoRow
            label="Role"
            value="Administrator"
            icon={<KeyRound className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* ── Ganti Password ──────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => { setShowForm(v => !v); setSuccess(false) }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ganti Password</h3>
              <p className="text-[11px] text-muted-foreground">
                Ubah password login admin Anda
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {success && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Berhasil
              </span>
            )}
            <div className={cn(
              'text-muted-foreground transition-transform',
              showForm && 'rotate-180'
            )}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit(d => mutation.mutate(d))}
            className="px-5 py-5 space-y-4"
          >
            {/* Password Lama */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Password Lama <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('password_lama')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Masukkan password saat ini"
                  className={cn(inputCls(!!errors.password_lama), 'pr-9')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password_lama && (
                <p className="text-[11px] text-destructive">{errors.password_lama.message}</p>
              )}
            </div>

            {/* Password Baru */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Password Baru <span className="text-destructive">*</span>
              </label>
              <input
                {...register('password_baru')}
                type={showPw ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                className={inputCls(!!errors.password_baru)}
              />
              {errors.password_baru && (
                <p className="text-[11px] text-destructive">{errors.password_baru.message}</p>
              )}
            </div>

            {/* Konfirmasi */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Konfirmasi Password Baru <span className="text-destructive">*</span>
              </label>
              <input
                {...register('konfirmasi')}
                type={showPw ? 'text' : 'password'}
                placeholder="Ulangi password baru"
                className={inputCls(!!errors.konfirmasi)}
              />
              {errors.konfirmasi && (
                <p className="text-[11px] text-destructive">{errors.konfirmasi.message}</p>
              )}
            </div>

            {/* Info */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex gap-2">
              <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Setelah ganti password, Anda tetap bisa menggunakan token yang aktif saat ini.
                Sesi baru akan membutuhkan password baru.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); reset() }}
                className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 h-9 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {mutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <KeyRound className="w-3.5 h-3.5" />}
                Ubah Password
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Info keamanan ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 flex gap-3">
        <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Untuk mengubah NIDN, nama, email, atau program studi, hubungi Super Admin.
          Perubahan data admin dicatat di Audit Log.
        </p>
      </div>
    </div>
  )
}