import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod' 
import toast from 'react-hot-toast'
import {
  Search, Plus, RefreshCw, Edit2, Trash2, MapPin,
  ChevronLeft, ChevronRight, X, Loader2, BookOpen,
  Clock, Navigation, Users, AlertTriangle, CheckCircle2,
  Map, Info, LayoutList,
} from 'lucide-react'
import {
  fetchMatakuliah, createMatakuliah, updateMatakuliah,
  deleteMatakuliah, toggleIzinTamu,
} from '@/api/matakuliah.api'
import type { AdminMatakuliah } from '@/api/matakuliah.api'
import KelasSheet from '@/components/KelasSheet'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const SKS_LIST  = [1, 2, 3, 4, 5, 6]

const HARI_COLOR: Record<string, string> = {
  Senin  : 'bg-blue-500/10 text-blue-500',
  Selasa : 'bg-violet-500/10 text-violet-500',
  Rabu   : 'bg-green-500/10 text-green-500',
  Kamis  : 'bg-amber-500/10 text-amber-500',
  Jumat  : 'bg-rose-500/10 text-rose-500',
  Sabtu  : 'bg-cyan-500/10 text-cyan-500',
  Minggu : 'bg-orange-500/10 text-orange-500',
}

// ── Zod Schemas ───────────────────────────────────────────────

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

const mkSchema = z.object({
  kode         : z.string().min(2, 'Kode minimal 2 karakter').max(20),
  nama         : z.string().min(3, 'Nama minimal 3 karakter').max(100),
  sks          : z.coerce.number().int().min(1).max(8),
  hari         : z.string().optional().nullable(),
  jam_mulai    : z.string().regex(timeRegex, 'Format HH:MM').optional().nullable().or(z.literal('')),
  jam_selesai  : z.string().regex(timeRegex, 'Format HH:MM').optional().nullable().or(z.literal('')),
  ruangan      : z.string().max(50).optional().nullable(),
  koordinat_lat: z.coerce.number().min(-90).max(90).optional().nullable().or(z.literal('')),
  koordinat_lng: z.coerce.number().min(-180).max(180).optional().nullable().or(z.literal('')),
  izin_tamu    : z.boolean().optional(),
})

type MkForm = z.infer<typeof mkSchema>

// ── Helper Components ─────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

function FormField({
  label, error, children, required,
}: {
  label: string; error?: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

const inputCls = (hasError?: boolean) => cn(
  'w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none',
  'focus:ring-2 focus:ring-ring/50 transition-all placeholder:text-muted-foreground/50',
  hasError ? 'border-destructive' : 'border-border hover:border-ring/50'
)

const selectCls = (hasError?: boolean) => cn(
  'w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none cursor-pointer',
  'focus:ring-2 focus:ring-ring/50 transition-all',
  hasError ? 'border-destructive' : 'border-border hover:border-ring/50'
)

// ── Toggle Switch Component ───────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  size = 'sm',
}: {
  checked  : boolean
  onChange  : (v: boolean) => void
  disabled ?: boolean
  size     ?: 'sm' | 'md'
}) {
  const isMd = size === 'md'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isMd ? 'w-11 h-6' : 'w-9 h-5',
        checked ? 'bg-green-500' : 'bg-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow transition-transform duration-200',
          isMd ? 'w-4 h-4 mt-1' : 'w-3 h-3 mt-1',
          checked
            ? isMd ? 'translate-x-6 ml-0.5' : 'translate-x-5 ml-0.5'
            : 'translate-x-1'
        )}
      />
    </button>
  )
}

// ── Modal: Form Matakuliah (Tambah / Edit) ────────────────────

function ModalFormMatakuliah({
  matakuliah,
  onClose,
}: {
  matakuliah?: AdminMatakuliah
  onClose    : () => void
}) {
  const isEdit = !!matakuliah
  const qc     = useQueryClient()
  const [activeTab, setActiveTab] = useState('info')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MkForm>({
    resolver    : zodResolver(mkSchema),
    defaultValues: matakuliah ? {
      kode         : matakuliah.kode,
      nama         : matakuliah.nama,
      sks          : matakuliah.sks,
      hari         : matakuliah.hari ?? '',
      jam_mulai    : matakuliah.jam_mulai ?? '',
      jam_selesai  : matakuliah.jam_selesai ?? '',
      ruangan      : matakuliah.ruangan ?? '',
      koordinat_lat: matakuliah.koordinat_lat ?? undefined,
      koordinat_lng: matakuliah.koordinat_lng ?? undefined,
      izin_tamu    : matakuliah.izin_tamu,
    } : {
      sks      : 3,
      izin_tamu: false,
    },
  })

  const izinTamu = watch('izin_tamu')
  const lat      = watch('koordinat_lat')
  const lng      = watch('koordinat_lng')

  const mutation = useMutation({
    mutationFn: (data: MkForm) => {
      const payload = {
        ...data,
        kode         : data.kode.trim().toUpperCase(),
        hari         : data.hari || null,
        jam_mulai    : data.jam_mulai || null,
        jam_selesai  : data.jam_selesai || null,
        ruangan      : data.ruangan || null,
        koordinat_lat: data.koordinat_lat ? Number(data.koordinat_lat) : null,
        koordinat_lng: data.koordinat_lng ? Number(data.koordinat_lng) : null,
        izin_tamu    : data.izin_tamu ?? false,
      }
      return isEdit
        ? updateMatakuliah(matakuliah!.id, payload)
        : createMatakuliah(payload)
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Terjadi kesalahan'
      toast.error(msg)
    },
  })

  const TABS = [
    { id: 'info',    label: 'Info Dasar',  icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'jadwal',  label: 'Jadwal',      icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'lokasi',  label: 'Lokasi GPS',  icon: <Map className="w-3.5 h-3.5" /> },
  ]

  const tabErrors = {
    info  : !!(errors.kode || errors.nama || errors.sks),
    jadwal: !!(errors.hari || errors.jam_mulai || errors.jam_selesai || errors.ruangan),
    lokasi: !!(errors.koordinat_lat || errors.koordinat_lng),
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              isEdit ? 'bg-amber-500/10' : 'bg-primary/10'
            )}>
              <BookOpen className={cn('w-4.5 h-4.5', isEdit ? 'text-amber-500' : 'text-primary')} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isEdit ? 'Edit Matakuliah' : 'Tambah Matakuliah'}
              </h2>
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">{matakuliah!.kode}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col flex-1 min-h-0">
          {/* Tabs */}
          <div className="px-5 pt-4 flex-shrink-0">
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all relative',
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tabErrors[tab.id as keyof typeof tabErrors] && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-destructive" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Tab 1: Info Dasar */}
            {activeTab === 'info' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <FormField label="Kode MK" error={errors.kode?.message} required>
                      <input
                        {...register('kode')}
                        placeholder="IF301"
                        className={cn(inputCls(!!errors.kode), 'uppercase')}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </FormField>
                  </div>
                  <div className="col-span-2">
                    <FormField label="SKS" error={errors.sks?.message} required>
                      <select {...register('sks')} className={selectCls(!!errors.sks)}>
                        {SKS_LIST.map(n => (
                          <option key={n} value={n}>{n} SKS</option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </div>

                <FormField label="Nama Matakuliah" error={errors.nama?.message} required>
                  <input
                    {...register('nama')}
                    placeholder="Pemrograman Mobile"
                    className={inputCls(!!errors.nama)}
                  />
                </FormField>

                {/* Izin Tamu Toggle */}
                <div className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors',
                  izinTamu
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border bg-muted/20'
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
                    size="md"
                    checked={!!izinTamu}
                    onChange={(v) => setValue('izin_tamu', v)}
                  />
                </div>
              </>
            )}

            {/* Tab 2: Jadwal */}
            {activeTab === 'jadwal' && (
              <>
                <FormField label="Hari" error={errors.hari?.message}>
                  <select {...register('hari')} className={selectCls(!!errors.hari)}>
                    <option value="">— Pilih hari —</option>
                    {HARI_LIST.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Jam Mulai" error={errors.jam_mulai?.message}>
                    <input
                      {...register('jam_mulai')}
                      type="time"
                      className={inputCls(!!errors.jam_mulai)}
                    />
                  </FormField>
                  <FormField label="Jam Selesai" error={errors.jam_selesai?.message}>
                    <input
                      {...register('jam_selesai')}
                      type="time"
                      className={inputCls(!!errors.jam_selesai)}
                    />
                  </FormField>
                </div>

                <FormField label="Ruangan" error={errors.ruangan?.message}>
                  <input
                    {...register('ruangan')}
                    placeholder="Lab Komputer A-301"
                    className={inputCls(!!errors.ruangan)}
                  />
                </FormField>

                {watch('hari') && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 flex items-center gap-3">
                    <div className={cn(
                      'w-2.5 h-10 rounded-full flex-shrink-0',
                      HARI_COLOR[watch('hari') ?? '']?.split(' ')[0] ?? 'bg-muted'
                    )} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{watch('nama') || '(nama belum diisi)'}</p>
                      <p className="text-xs text-muted-foreground">
                        {watch('hari')}
                        {watch('jam_mulai') && ` · ${watch('jam_mulai')}`}
                        {watch('jam_selesai') && ` – ${watch('jam_selesai')}`}
                        {watch('ruangan') && ` · ${watch('ruangan')}`}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tab 3: Lokasi GPS */}
            {activeTab === 'lokasi' && (
              <>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
                  <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Koordinat digunakan untuk validasi GPS saat presensi offline.
                    Mahasiswa harus berada dalam radius 100 meter dari titik ini.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Latitude" error={errors.koordinat_lat?.message}>
                    <input
                      {...register('koordinat_lat')}
                      type="number"
                      step="any"
                      placeholder="-5.130245"
                      className={inputCls(!!errors.koordinat_lat)}
                    />
                  </FormField>
                  <FormField label="Longitude" error={errors.koordinat_lng?.message}>
                    <input
                      {...register('koordinat_lng')}
                      type="number"
                      step="any"
                      placeholder="119.489432"
                      className={inputCls(!!errors.koordinat_lng)}
                    />
                  </FormField>
                </div>

                {lat && lng && Number(lat) !== 0 && Number(lng) !== 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <iframe
                      title="Maps Preview"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.003},${Number(lat) - 0.003},${Number(lng) + 0.003},${Number(lat) + 0.003}&layer=mapnik&marker=${lat},${lng}`}
                      className="w-full h-44 border-0"
                      loading="lazy"
                    />
                    <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                      </p>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Buka Maps
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Map className="w-8 h-8 opacity-30" />
                    <p className="text-xs">Isi koordinat untuk melihat preview peta</p>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Tips:</span> Buka Google Maps → klik kanan pada lokasi gedung/ruangan → salin koordinat yang muncul.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isEdit ? 'Simpan Perubahan' : 'Buat Matakuliah'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Konfirmasi Hapus ───────────────────────────────────

function ModalHapus({
  matakuliah,
  onClose,
}: {
  matakuliah: AdminMatakuliah
  onClose   : () => void
}) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteMatakuliah(matakuliah.id),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
      onClose()
    },
    onError: () => toast.error('Gagal menghapus matakuliah'),
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
        <div className="text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Hapus Matakuliah?</h2>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {matakuliah.kode} — {matakuliah.nama}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Semua data terkait (sesi presensi, data presensi, enrollment mahasiswa) akan ikut terhapus secara permanen dan tidak bisa dikembalikan.
            </p>
          </div>
          {matakuliah.total_mahasiswa > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {matakuliah.total_mahasiswa} mahasiswa masih terdaftar di matakuliah ini.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Ya, Hapus
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Inline Toggle IzinTamu ────────────────────────────────────

function IzinTamuToggle({ matakuliah }: { matakuliah: AdminMatakuliah }) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (val: boolean) => toggleIzinTamu(matakuliah.id, val),
    onSuccess : (res, val) => {
      toast.success(res.message)
      qc.setQueryData(['admin-matakuliah'], (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const data = old as { items: AdminMatakuliah[] }
        return {
          ...data,
          items: data.items.map((m) =>
            m.id === matakuliah.id ? { ...m, izin_tamu: val } : m
          ),
        }
      })
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
    },
    onError: () => toast.error('Gagal mengubah izin tamu'),
  })

  return (
    <div className="flex items-center gap-1.5">
      <ToggleSwitch
        checked={matakuliah.izin_tamu}
        onChange={(v) => mutation.mutate(v)}
        disabled={mutation.isPending}
      />
      {mutation.isPending && (
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      )}
    </div>
  )
}

// ── Skeleton Row ──────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[10, 16, 30, 8, 16, 20, 14, 14, 14, 10].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded bg-muted animate-pulse"
            style={{ width: `${w * 6}px`, maxWidth: '100%' }}
          />
        </td>
      ))}
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────

type ModalState =
  | { type: 'tambah' }
  | { type: 'edit';  mk: AdminMatakuliah }
  | { type: 'hapus'; mk: AdminMatakuliah }
  | null

export default function Matakuliah() {
  const [modal, setModal]           = useState<ModalState>(null)
  const [kelasSheetMk, setKelasSheetMk] = useState<AdminMatakuliah | null>(null)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
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
    queryKey : ['admin-matakuliah', debouncedSearch, page],
    queryFn  : () => fetchMatakuliah({ search: debouncedSearch || undefined, page, limit: 20 }),
    staleTime: 30_000,
  })

  const closeModal = () => setModal(null)

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matakuliah</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola matakuliah, kelas, jadwal, koordinat GPS, dan izin mahasiswa tamu.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'tambah' })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Matakuliah
        </button>
      </div>

      {/* ── Stat Strip ─────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Matakuliah',
              value: data.total,
              icon : <BookOpen className="w-4 h-4 text-blue-500" />,
              bg   : 'bg-blue-500/10',
            },
            {
              label: 'Dengan GPS',
              value: data.items.filter(m => m.koordinat_lat).length,
              icon : <MapPin className="w-4 h-4 text-green-500" />,
              bg   : 'bg-green-500/10',
            },
            {
              label: 'Izin Tamu Aktif',
              value: data.items.filter(m => m.izin_tamu).length,
              icon : <Users className="w-4 h-4 text-violet-500" />,
              bg   : 'bg-violet-500/10',
            },
            {
              label: 'Total Mahasiswa',
              value: data.items.reduce((s, m) => s + m.total_mahasiswa, 0),
              icon : <CheckCircle2 className="w-4 h-4 text-amber-500" />,
              bg   : 'bg-amber-500/10',
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', stat.bg)}>
                {stat.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari kode, nama, atau ruangan..."
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
            {data.total} matakuliah
          </p>
        )}
      </div>

      {/* ── Tabel ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-8">No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nama Matakuliah</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-14">SKS</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Hari</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Jam & Ruangan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell w-16">GPS</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-28">Izin Tamu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-20">Enrolled</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <BookOpen className="w-8 h-8 opacity-30" />
                      <p className="text-sm">
                        {debouncedSearch
                          ? `Tidak ada matakuliah yang cocok dengan "${debouncedSearch}"`
                          : 'Belum ada data matakuliah'}
                      </p>
                      {!debouncedSearch && (
                        <button
                          onClick={() => setModal({ type: 'tambah' })}
                          className="text-xs text-primary hover:underline"
                        >
                          + Tambah matakuliah pertama
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map((mk, idx) => (
                  <tr key={mk.id} className="hover:bg-muted/20 transition-colors group">
                    {/* No */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(page - 1) * 20 + idx + 1}
                    </td>

                    {/* Kode */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold font-mono">
                        {mk.kode}
                      </span>
                    </td>

                    {/* Nama */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{mk.nama}</p>
                    </td>

                    {/* SKS */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {mk.sks} SKS
                      </span>
                    </td>

                    {/* Hari */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {mk.hari ? (
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold',
                          HARI_COLOR[mk.hari] ?? 'bg-muted text-muted-foreground'
                        )}>
                          {mk.hari}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Jam & Ruangan */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {mk.jam_mulai ? (
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {mk.jam_mulai}
                            {mk.jam_selesai && ` – ${mk.jam_selesai}`}
                          </p>
                          {mk.ruangan && (
                            <p className="text-[11px] text-muted-foreground">{mk.ruangan}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* GPS badge */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {mk.koordinat_lat ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-semibold">
                          <MapPin className="w-2.5 h-2.5" />
                          GPS
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Izin Tamu Toggle */}
                    <td className="px-4 py-3">
                      <IzinTamuToggle matakuliah={mk} />
                    </td>

                    {/* Enrolled */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {mk.total_mahasiswa}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* ── Tombol Kelola Kelas (Fase B.4) ── */}
                        <button
                          onClick={() => setKelasSheetMk(mk)}
                          title="Kelola Kelas"
                          className="flex items-center gap-1 h-7 px-2 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
                        >
                          <LayoutList className="w-3 h-3" />
                          <span className="hidden sm:inline">Kelas</span>
                        </button>
                        <button
                          onClick={() => setModal({ type: 'edit', mk })}
                          title="Edit"
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'hapus', mk })}
                          title="Hapus"
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
              Halaman {page} dari {data.total_pages} · Total {data.total} matakuliah
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
      {modal?.type === 'tambah' && (
        <ModalFormMatakuliah onClose={closeModal} />
      )}
      {modal?.type === 'edit' && (
        <ModalFormMatakuliah matakuliah={modal.mk} onClose={closeModal} />
      )}
      {modal?.type === 'hapus' && (
        <ModalHapus matakuliah={modal.mk} onClose={closeModal} />
      )}

      {/* ── KelasSheet (Fase B.4) ───────────────────────── */}
      {kelasSheetMk && (
        <KelasSheet
          mk={kelasSheetMk}
          onClose={() => setKelasSheetMk(null)}
        />
      )}
    </div>
  )
}