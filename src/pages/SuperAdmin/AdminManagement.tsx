// src/pages/SuperAdmin/AdminManagement.tsx
// Fase E — Halaman kelola akun Admin Fakultas (hanya Super Admin)

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, MoreHorizontal, Shield, ShieldOff, ShieldCheck,
  KeyRound, Pencil, UserCheck, UserX, AlertTriangle,
  Mail, Hash, Building2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  fetchAdmins, createAdmin, updateAdmin,
  toggleAdmin, resetPasswordAdmin,
  type AdminFakultas, type BuatAdminPayload,
} from '@/api/superadmin.api'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

// ── Helpers ───────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card size="sm">
      <CardContent className="pt-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
          </div>
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Form Modal ────────────────────────────────────────────────
type FormMode = 'create' | 'edit' | null

interface FormState {
  nim_nidn: string
  nama_lengkap: string
  email: string
  password: string
  program_studi: string
}

const EMPTY_FORM: FormState = {
  nim_nidn: '', nama_lengkap: '', email: '', password: '', program_studi: '',
}

function AdminFormModal({
  mode, admin, onClose,
}: {
  mode: FormMode
  admin: AdminFakultas | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(
    mode === 'edit' && admin
      ? { nim_nidn: admin.nim_nidn, nama_lengkap: admin.nama_lengkap, email: admin.email, password: '', program_studi: admin.program_studi }
      : EMPTY_FORM
  )
  const [errors, setErrors] = useState<Partial<FormState>>({})

  const createMut = useMutation({
    mutationFn: (p: BuatAdminPayload) => createAdmin(p),
    onSuccess: () => {
      toast.success('Akun admin berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal membuat admin'
      toast.error(msg)
    },
  })

  const updateMut = useMutation({
    mutationFn: (p: Partial<FormState>) => updateAdmin(admin!.id, p),
    onSuccess: () => {
      toast.success('Data admin berhasil diupdate')
      qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal update admin'
      toast.error(msg)
    },
  })

  const validate = () => {
    const errs: Partial<FormState> = {}
    if (!form.nim_nidn.trim()) errs.nim_nidn = 'NIM/NIDN wajib diisi'
    if (!form.nama_lengkap.trim()) errs.nama_lengkap = 'Nama wajib diisi'
    if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Email tidak valid'
    if (mode === 'create' && form.password.length < 8) errs.password = 'Password minimal 8 karakter'
    if (!form.program_studi.trim()) errs.program_studi = 'Program studi / unit wajib diisi'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (mode === 'create') {
      createMut.mutate(form as BuatAdminPayload)
    } else {
      const payload: Partial<FormState> = {
        nim_nidn: form.nim_nidn,
        nama_lengkap: form.nama_lengkap,
        email: form.email,
        program_studi: form.program_studi,
      }
      updateMut.mutate(payload)
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  const field = (
    key: keyof FormState,
    label: string,
    placeholder: string,
    type = 'text',
  ) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => { setForm(p => ({ ...p, [key]: e.target.value })); setErrors(p => ({ ...p, [key]: undefined })) }}
        aria-invalid={!!errors[key]}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  )

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Admin Fakultas' : 'Edit Admin Fakultas'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Buat akun Admin Fakultas baru. Admin bisa mengelola data akademik.'
              : 'Perbarui data akun Admin Fakultas.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          {field('nim_nidn', 'NIM / NIDN', 'Contoh: ADM001')}
          {field('nama_lengkap', 'Nama Lengkap', 'Nama lengkap admin')}
          {field('email', 'Email', 'admin@kampus.ac.id', 'email')}
          {mode === 'create' && field('password', 'Password', 'Min. 8 karakter', 'password')}
          {field('program_studi', 'Unit / Fakultas', 'Contoh: Fakultas Komunikasi dan Informatika')}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Menyimpan...' : mode === 'create' ? 'Buat Akun' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Reset Password Modal ──────────────────────────────────────
function ResetPasswordModal({
  admin, onClose,
}: { admin: AdminFakultas; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')

  const mut = useMutation({
    mutationFn: () => resetPasswordAdmin(admin.id, pw),
    onSuccess: () => { toast.success('Password berhasil direset'); onClose() },
    onError: () => toast.error('Gagal mereset password'),
  })

  const handleSubmit = () => {
    if (pw.length < 8) { setErr('Password minimal 8 karakter'); return }
    if (pw !== confirm) { setErr('Konfirmasi password tidak cocok'); return }
    setErr('')
    mut.mutate()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Reset password untuk <strong>{admin.nama_lengkap}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Password Baru</label>
            <Input type="password" placeholder="Min. 8 karakter" value={pw}
              onChange={e => { setPw(e.target.value); setErr('') }} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Konfirmasi Password</label>
            <Input type="password" placeholder="Ulangi password baru" value={confirm}
              onChange={e => { setConfirm(e.target.value); setErr('') }} />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={mut.isPending}>
            {mut.isPending ? 'Mereset...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Confirm Toggle Modal ──────────────────────────────────────
function ConfirmToggleModal({
  admin, onClose,
}: { admin: AdminFakultas; onClose: () => void }) {
  const qc = useQueryClient()
  const willDeactivate = admin.is_active

  const mut = useMutation({
    mutationFn: () => toggleAdmin(admin.id, !admin.is_active),
    onSuccess: () => {
      toast.success(`Admin berhasil ${willDeactivate ? 'dinonaktifkan' : 'diaktifkan'}`)
      qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal mengubah status'
      toast.error(msg)
    },
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {willDeactivate ? 'Nonaktifkan Admin?' : 'Aktifkan Admin?'}
          </DialogTitle>
          <DialogDescription>
            {willDeactivate
              ? `Admin ${admin.nama_lengkap} tidak akan bisa login setelah dinonaktifkan.`
              : `Admin ${admin.nama_lengkap} akan bisa login kembali.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Batal</Button>
          <Button
            variant={willDeactivate ? 'destructive' : 'default'}
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
          >
            {mut.isPending ? 'Memproses...' : willDeactivate ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminManagement() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminFakultas | null>(null)
  const [resetTarget, setResetTarget] = useState<AdminFakultas | null>(null)
  const [toggleTarget, setToggleTarget] = useState<AdminFakultas | null>(null)

  const LIMIT = 15

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-admins', search, page],
    queryFn: () => fetchAdmins({ search: search || undefined, page, limit: LIMIT }),
    placeholderData: prev => prev,
  })

  const admins = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  const activeCount = admins.filter(a => a.is_active).length
  const inactiveCount = admins.length - activeCount

  const openEdit = (admin: AdminFakultas) => {
    setSelectedAdmin(admin)
    setFormMode('edit')
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Kelola Admin Fakultas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Buat dan kelola akun Admin Fakultas yang bisa mengakses dashboard.
          </p>
        </div>
        <Button onClick={() => { setSelectedAdmin(null); setFormMode('create') }} className="shrink-0">
          <Plus className="w-4 h-4" />
          Tambah Admin
        </Button>
      </div>

      {/* ── Stat strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Admin" value={total} icon={Shield} color="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <StatCard label="Aktif" value={activeCount} icon={UserCheck} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Nonaktif" value={inactiveCount} icon={UserX} color="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <Card size="sm">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIM/NIDN, email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground ml-auto shrink-0">
              {total} admin ditemukan
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="py-16 text-center">
              <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Tidak ada admin yang cocok' : 'Belum ada akun Admin Fakultas'}
              </p>
              {!search && (
                <Button size="sm" className="mt-3" onClick={() => setFormMode('create')}>
                  Buat Admin Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                  {/* Avatar */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                    admin.is_active
                      ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {getInitials(admin.nama_lengkap)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{admin.nama_lengkap}</p>
                      <Badge variant={admin.is_active ? 'default' : 'outline'} className="text-[10px] h-4 shrink-0">
                        {admin.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Hash className="w-3 h-3" />{admin.nim_nidn}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                        <Mail className="w-3 h-3" />{admin.email}
                      </span>
                    </div>
                  </div>

                  {/* Prodi */}
                  <div className="hidden md:flex items-center gap-1.5 max-w-[200px]">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{admin.program_studi}</span>
                  </div>

                  {/* Tanggal */}
                  <p className="hidden lg:block text-xs text-muted-foreground shrink-0">
                    {formatDate(admin.created_at)}
                  </p>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(admin)}>
                        <Pencil className="w-3.5 h-3.5" />Edit Data
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResetTarget(admin)}>
                        <KeyRound className="w-3.5 h-3.5" />Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant={admin.is_active ? 'destructive' : 'default'}
                        onClick={() => setToggleTarget(admin)}
                      >
                        {admin.is_active
                          ? <><ShieldOff className="w-3.5 h-3.5" />Nonaktifkan</>
                          : <><ShieldCheck className="w-3.5 h-3.5" />Aktifkan</>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Hal {page} dari {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline" size="icon-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ──────────────────────────────────────────── */}
      {(formMode === 'create' || formMode === 'edit') && (
        <AdminFormModal
          mode={formMode}
          admin={selectedAdmin}
          onClose={() => { setFormMode(null); setSelectedAdmin(null) }}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          admin={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
      {toggleTarget && (
        <ConfirmToggleModal
          admin={toggleTarget}
          onClose={() => setToggleTarget(null)}
        />
      )}
    </div>
  )
}