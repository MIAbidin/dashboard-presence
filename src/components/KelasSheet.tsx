// src/components/KelasSheet.tsx
// ─────────────────────────────────────────────────────────────
// Sheet "Kelola Kelas" — Fase B.4
// Dibuka dari tombol di tabel Matakuliah.tsx
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  X, Plus, Edit2, Trash2, Loader2, Users, Clock,
  MapPin, GraduationCap, Link, ShieldCheck, ShieldOff,
  RefreshCw, AlertTriangle, CheckCircle2, BookOpen,
} from 'lucide-react'
import {
  fetchKelas, createKelas, updateKelas, deleteKelas,
  toggleIzinTamuKelas, fetchSlotOptions,
} from '@/api/kelas.api'
import { fetchUsers } from '@/api/users.api'
import { fetchRuanganAktif } from '@/api/ruangan.api'
import type { AdminMatakuliah } from '@/api/matakuliah.api'
import type { KelasMatakuliah } from '@/api/kelas.api'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

const KODE_KELAS_LIST = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X', 'Y', 'Z', 'I', 'J', 'K']

// ── Zod Schema ─────────────────────────────────────────────────

const kelasSchema = z.object({
  kode_kelas  : z.string().min(1, 'Kode kelas wajib diisi').max(5),
  dosen_id    : z.string().optional().nullable(),
  ruangan_id  : z.string().optional().nullable(),
  hari        : z.string().optional().nullable(),
  slot_mulai  : z.coerce.number().int().min(1).max(12).optional().nullable().or(z.literal('')),
  slot_selesai: z.coerce.number().int().min(1).max(12).optional().nullable().or(z.literal('')),
  kode_akses  : z.string().optional().nullable(),
  izin_tamu   : z.boolean().optional(),
})

type KelasForm = z.infer<typeof kelasSchema>

// ── Helper Components ──────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

const inputCls = (hasError?: boolean) => cn(
  'w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none',
  'focus:ring-2 focus:ring-ring/50 transition-all placeholder:text-muted-foreground/50',
  hasError ? 'border-destructive' : 'border-border hover:border-ring/40'
)

const selectCls = () => cn(
  'w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none cursor-pointer',
  'focus:ring-2 focus:ring-ring/50 transition-all appearance-none'
)

// ── Toggle Switch ─────────────────────────────────────────────

function ToggleSwitch({
  checked, onChange, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex w-9 h-5 shrink-0 rounded-full transition-colors',
        checked ? 'bg-green-500' : 'bg-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'inline-block w-3 h-3 rounded-full bg-white shadow mt-1 transition-transform',
        checked ? 'translate-x-5 ml-0.5' : 'translate-x-1'
      )} />
    </button>
  )
}

// ── Modal: Form Kelas ─────────────────────────────────────────

function ModalFormKelas({
  mkId,
  mkNama,
  kelas,
  onClose,
}: {
  mkId   : string
  mkNama : string
  kelas ?: KelasMatakuliah
  onClose: () => void
}) {
  const isEdit = !!kelas
  const qc     = useQueryClient()

  const { data: dosenData } = useQuery({
    queryKey : ['kelas-dosen-options'],
    queryFn  : () => fetchUsers({ role: 'dosen', limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const { data: ruanganData } = useQuery({
    queryKey : ['kelas-ruangan-options'],
    queryFn  : () => fetchRuanganAktif(),
    staleTime: 5 * 60_000,
  })

  const { data: slotData } = useQuery({
    queryKey : ['slot-options'],
    queryFn  : fetchSlotOptions,
    staleTime: Infinity,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<KelasForm>({
    resolver     : zodResolver(kelasSchema),
    defaultValues: kelas ? {
      kode_kelas  : kelas.kode_kelas,
      dosen_id    : kelas.dosen_id ?? '',
      ruangan_id  : kelas.ruangan_id ?? '',
      hari        : kelas.hari ?? '',
      slot_mulai  : kelas.slot_mulai ?? undefined,
      slot_selesai: kelas.slot_selesai ?? undefined,
      kode_akses  : kelas.kode_akses ?? '',
      izin_tamu   : kelas.izin_tamu,
    } : { izin_tamu: false },
  })

  const izinTamu   = watch('izin_tamu')
  const slotMulai  = watch('slot_mulai')
  const slotSelesai= watch('slot_selesai')

  // Preview jam dari slot
  const jamPreview = (() => {
    if (!slotMulai || !slotSelesai) return null
    const opts = slotData ?? []
    const mulai  = opts.find(s => s.slot === Number(slotMulai))
    const selesai = opts.find(s => s.slot === Number(slotSelesai))
    if (!mulai || !selesai) return null
    return `${mulai.jam_mulai} – ${selesai.jam_selesai}`
  })()

  const mutation = useMutation({
    mutationFn: (data: KelasForm) => {
      const payload = {
        kode_kelas  : data.kode_kelas.toUpperCase(),
        dosen_id    : data.dosen_id   || null,
        ruangan_id  : data.ruangan_id || null,
        hari        : data.hari        || null,
        slot_mulai  : data.slot_mulai  ? Number(data.slot_mulai)  : null,
        slot_selesai: data.slot_selesai? Number(data.slot_selesai): null,
        kode_akses  : data.kode_akses  || null,
        izin_tamu   : data.izin_tamu ?? false,
      }
      return isEdit
        ? updateKelas(mkId, kelas!.id, payload)
        : createKelas(mkId, payload)
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['kelas', mkId] })
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Terjadi kesalahan'
      toast.error(msg)
    },
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
              isEdit ? 'bg-amber-500/10' : 'bg-primary/10'
            )}>
              <BookOpen className={cn('w-4 h-4', isEdit ? 'text-amber-500' : 'text-primary')} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isEdit ? 'Edit Kelas' : 'Tambah Kelas'}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{mkNama}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Kode Kelas */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Kode Kelas <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {KODE_KELAS_LIST.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setValue('kode_kelas', k)}
                    className={cn(
                      'h-9 rounded-lg border text-sm font-bold transition-all',
                      watch('kode_kelas') === k
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
              {/* Also allow free input */}
              <input
                {...register('kode_kelas')}
                placeholder="Atau ketik kode kelas..."
                className={cn(inputCls(!!errors.kode_kelas), 'uppercase text-center font-bold tracking-widest')}
              />
              {errors.kode_kelas && <p className="text-[11px] text-destructive">{errors.kode_kelas.message}</p>}
            </div>

            {/* Dosen */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Dosen Pengampu</label>
              <select {...register('dosen_id')} className={selectCls()}>
                <option value="">— Pilih dosen —</option>
                {dosenData?.items.map(d => (
                  <option key={d.id} value={d.id}>{d.nama_lengkap} ({d.nim_nidn})</option>
                ))}
              </select>
            </div>

            {/* Ruangan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Ruangan</label>
              <select {...register('ruangan_id')} className={selectCls()}>
                <option value="">— Pilih ruangan —</option>
                {(ruanganData ?? []).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.kode} — {r.nama}{r.gedung ? ` (${r.gedung})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Hari */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Hari</label>
              <select {...register('hari')} className={selectCls()}>
                <option value="">— Pilih hari —</option>
                {HARI_LIST.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Slot */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Slot Waktu</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Slot Mulai</label>
                  <select {...register('slot_mulai')} className={selectCls()}>
                    <option value="">— Pilih slot —</option>
                    {(slotData ?? []).map(s => (
                      <option key={s.slot} value={s.slot}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Slot Selesai</label>
                  <select {...register('slot_selesai')} className={selectCls()}>
                    <option value="">— Pilih slot —</option>
                    {(slotData ?? []).map(s => (
                      <option key={s.slot} value={s.slot}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Preview jam */}
              {jamPreview && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <p className="text-xs font-semibold text-primary">{jamPreview}</p>
                </div>
              )}
            </div>

            {/* Kode Akses */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Kode Akses
                <span className="text-muted-foreground font-normal ml-1">(URL Classroom / Kode WA)</span>
              </label>
              <input
                {...register('kode_akses')}
                placeholder="https://classroom.google.com/c/... atau kode WA"
                className={inputCls()}
              />
            </div>

            {/* Izin Tamu */}
            <div className={cn(
              'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors',
              izinTamu ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/20'
            )}>
              <div>
                <p className="text-sm font-medium text-foreground">Izin Tamu</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {izinTamu
                    ? 'Mahasiswa kelas lain dapat presensi otomatis'
                    : 'Hanya mahasiswa terdaftar yang bisa presensi'}
                </p>
              </div>
              <ToggleSwitch
                checked={!!izinTamu}
                onChange={(v) => setValue('izin_tamu', v)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Batal
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isEdit ? 'Simpan Perubahan' : 'Tambah Kelas'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Konfirmasi Hapus Kelas ─────────────────────────────

function ModalHapusKelas({
  mkId, kelas, onClose,
}: { mkId: string; kelas: KelasMatakuliah; onClose: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteKelas(mkId, kelas.id),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['kelas', mkId] })
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Gagal menghapus kelas'
      toast.error(msg)
    },
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
        <div className="text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Hapus Kelas {kelas.kode_kelas}?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {kelas.total_enrolled > 0
              ? `Tidak bisa dihapus — masih ada ${kelas.total_enrolled} mahasiswa terdaftar di kelas ini.`
              : 'Kelas ini akan dihapus permanen. Tindakan tidak bisa dibatalkan.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            {kelas.total_enrolled > 0 ? 'Tutup' : 'Batal'}
          </button>
          {kelas.total_enrolled === 0 && (
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Ya, Hapus
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Inline Toggle Izin Tamu per Kelas ─────────────────────────

function IzinTamuToggleKelas({ mkId, kelas }: { mkId: string; kelas: KelasMatakuliah }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (val: boolean) => toggleIzinTamuKelas(kelas.id, val),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['kelas', mkId] })
    },
    onError: () => toast.error('Gagal mengubah izin tamu'),
  })

  return (
    <div className="flex items-center gap-1.5">
      <ToggleSwitch
        checked={kelas.izin_tamu}
        onChange={(v) => mutation.mutate(v)}
        disabled={mutation.isPending}
      />
      {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
    </div>
  )
}

// ── Main Sheet Component ──────────────────────────────────────

interface KelasSheetProps {
  mk     : AdminMatakuliah
  onClose: () => void
}

type ModalState =
  | { type: 'tambah' }
  | { type: 'edit';  kelas: KelasMatakuliah }
  | { type: 'hapus'; kelas: KelasMatakuliah }
  | null

export default function KelasSheet({ mk, onClose }: KelasSheetProps) {
  const [modal, setModal] = useState<ModalState>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey : ['kelas', mk.id],
    queryFn  : () => fetchKelas(mk.id),
    staleTime: 30_000,
  })

  const kelasList = data?.kelas ?? []

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-3xl bg-card border-l border-border shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">
                {mk.kode}
              </span>
              <span className="text-[11px] text-muted-foreground">{mk.sks} SKS</span>
            </div>
            <h2 className="text-base font-semibold text-foreground truncate">{mk.nama}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola kelas — dosen, ruangan, jadwal, dan slot waktu
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} disabled={isFetching}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            <button onClick={() => setModal({ type: 'tambah' })}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Tambah Kelas
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-px bg-border flex-shrink-0">
          {[
            { label: 'Total Kelas',    value: data?.total_kelas ?? 0,
              icon: <BookOpen className="w-3.5 h-3.5 text-primary" /> },
            { label: 'Total Enrolled', value: (kelasList.reduce((s, k) => s + k.total_enrolled, 0) + (data?.legacy_enrolled ?? 0)),
              icon: <Users className="w-3.5 h-3.5 text-green-500" /> },
            { label: 'Legacy (no kelas)', value: data?.legacy_enrolled ?? 0,
              icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
          ].map((s) => (
            <div key={s.label} className="bg-muted/20 px-5 py-3 flex items-center gap-2">
              {s.icon}
              <div>
                <p className="text-sm font-bold text-foreground leading-none">{isLoading ? '—' : s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : kelasList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <BookOpen className="w-10 h-10 opacity-25" />
              <p className="text-sm">Belum ada kelas untuk matakuliah ini</p>
              <button onClick={() => setModal({ type: 'tambah' })}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Tambah Kelas Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-16">Kelas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Dosen</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Ruangan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Hari & Slot</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Jam</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-16">Enrolled</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell w-24">Izin Tamu</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {kelasList.map((k) => (
                    <tr key={k.id} className="hover:bg-muted/20 transition-colors group">
                      {/* Kode Kelas */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                          k.is_active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {k.kode_kelas}
                        </span>
                      </td>

                      {/* Dosen */}
                      <td className="px-4 py-3">
                        {k.nama_dosen ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-bold text-violet-500">
                                {k.nama_dosen[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                                {k.nama_dosen}
                              </p>
                              {k.nidn_dosen && (
                                <p className="text-[10px] text-muted-foreground font-mono">{k.nidn_dosen}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            Belum diset
                          </span>
                        )}
                      </td>

                      {/* Ruangan */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {k.kode_ruangan ? (
                          <div>
                            <p className="text-xs font-medium text-foreground">{k.kode_ruangan}</p>
                            {k.nama_ruangan && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                {k.nama_ruangan}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Belum diset
                          </span>
                        )}
                      </td>

                      {/* Hari & Slot */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {(k.hari || k.slot_mulai) ? (
                          <div>
                            {k.hari && (
                              <p className="text-xs font-medium text-foreground">{k.hari}</p>
                            )}
                            {k.slot_mulai && k.slot_selesai && (
                              <p className="text-[10px] text-muted-foreground">
                                Slot {k.slot_mulai}–{k.slot_selesai}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Jam */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {k.jam_range ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {k.jam_range}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Enrolled */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{k.total_enrolled}</span>
                        </div>
                      </td>

                      {/* Izin Tamu */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <IzinTamuToggleKelas mkId={mk.id} kelas={k} />
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {k.kode_akses && (
                            <a
                              href={k.kode_akses.startsWith('http') ? k.kode_akses : `https://${k.kode_akses}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka kode akses"
                              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5 transition-colors"
                            >
                              <Link className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setModal({ type: 'edit', kelas: k })}
                            title="Edit kelas"
                            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'hapus', kelas: k })}
                            title="Hapus kelas"
                            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legacy enrollment warning */}
              {(data?.legacy_enrolled ?? 0) > 0 && (
                <div className="mx-4 my-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Ada <strong>{data?.legacy_enrolled}</strong> mahasiswa terdaftar di matakuliah ini tanpa kelas spesifik (enrollment lama sebelum Fase B).
                    Mereka tetap bisa presensi. Assign ke kelas via halaman Enrollment jika diperlukan.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      {modal?.type === 'tambah' && (
        <ModalFormKelas mkId={mk.id} mkNama={mk.nama} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <ModalFormKelas mkId={mk.id} mkNama={mk.nama} kelas={modal.kelas} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'hapus' && (
        <ModalHapusKelas mkId={mk.id} kelas={modal.kelas} onClose={() => setModal(null)} />
      )}
    </>
  )
}