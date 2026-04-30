import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ── Zod schema validasi ───────────────────────────────────────
const loginSchema = z.object({
  nim_nidn: z
    .string()
    .min(1, 'NIM/NIDN wajib diisi')
    .min(5, 'NIM/NIDN minimal 5 karakter'),
  password: z
    .string()
    .min(1, 'Password wajib diisi')
    .min(6, 'Password minimal 6 karakter'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const { login, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.nim_nidn, data.password)
      toast.success('Selamat datang kembali!')
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Login gagal. Periksa kembali kredensial Anda.'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* ── Panel kiri — branding ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-navy-800 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-navy-700/50" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-navy-900/60" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-48 h-48 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Presensi SKS</p>
            <p className="text-white/50 text-xs mt-0.5">Admin Dashboard</p>
          </div>
        </div>

        {/* Copy tengah */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              {['Mahasiswa', 'Dosen', 'Matakuliah', 'Laporan'].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md bg-white/10 text-white/70 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Kelola seluruh sistem presensi dari satu tempat
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Dashboard terpusat untuk admin kampus — manajemen pengguna, matakuliah,
              laporan kehadiran, dan monitoring real-time.
            </p>
          </div>

          {/* Stats mini */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mahasiswa', value: '500+' },
              { label: 'Matakuliah', value: '24' },
              { label: 'Akurasi Wajah', value: '≥ 85%' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/10 p-3 backdrop-blur-sm"
              >
                <p className="text-white font-bold text-lg leading-none">{stat.value}</p>
                <p className="text-white/50 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/30 text-xs">
          © 2026 Presensi SKS. Sistem Kehadiran Mahasiswa berbasis Face Recognition.
        </p>
      </div>

      {/* ── Panel kanan — form login ───────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-none">Presensi SKS</p>
            <p className="text-muted-foreground text-xs mt-0.5">Admin Dashboard</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Masuk ke Dashboard</h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              Gunakan akun admin kampus untuk melanjutkan
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* NIM/NIDN */}
            <div className="space-y-1.5">
              <label htmlFor="nim_nidn" className="text-sm font-medium text-foreground">
                NIM / NIDN Admin
              </label>
              <input
                id="nim_nidn"
                type="text"
                placeholder="Masukkan NIM atau NIDN"
                autoComplete="username"
                autoFocus
                {...register('nim_nidn')}
                className={cn(
                  'w-full h-10 rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'transition-colors',
                  errors.nim_nidn
                    ? 'border-destructive focus:ring-destructive/30'
                    : 'border-border hover:border-border/80'
                )}
              />
              {errors.nim_nidn && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠</span> {errors.nim_nidn.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={cn(
                    'w-full h-10 rounded-lg border bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    'transition-colors',
                    errors.password
                      ? 'border-destructive focus:ring-destructive/30'
                      : 'border-border hover:border-border/80'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Tombol submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full h-10 rounded-lg bg-navy-800 text-white text-sm font-semibold',
                'hover:bg-navy-700 active:bg-navy-900 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2 mt-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                'Masuk ke Dashboard'
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">Khusus Admin Kampus.</span> Jika kamu
              adalah mahasiswa atau dosen, gunakan aplikasi mobile Presensi SKS.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Lupa password? Hubungi IT kampus untuk reset akun.
          </p>
        </div>
      </div>
    </div>
  )
}