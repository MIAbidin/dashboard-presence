import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Search, Plus, RefreshCw, Edit2, Trash2,
  ChevronLeft, ChevronRight, X, Loader2,
  MapPin, Building2, Users, Map, Info,
  Navigation, ToggleLeft, ToggleRight,
  FlaskConical, School, Presentation, LayoutGrid,
  AlertTriangle,
} from 'lucide-react'
import {
  fetchRuangan, createRuangan, updateRuangan,
  deleteRuangan, toggleRuangan,
} from '@/api/ruangan.api'
import type { Ruangan } from '@/api/ruangan.api'
import { cn } from '@/lib/utils'

// ── Constants ──────────────────────────────────────────────────

const TIPE_LIST = ['kuliah', 'lab', 'seminar', 'lainnya']

const TIPE_CONFIG: Record<string, {
  label: string
  color: string
  bg   : string
  icon : React.ReactNode
}> = {
  kuliah : { label: 'Kuliah',  color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/10',   icon: <School className="w-3 h-3" /> },
  lab    : { label: 'Lab',     color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10',  icon: <FlaskConical className="w-3 h-3" /> },
  seminar: { label: 'Seminar', color: 'text-violet-600 dark:text-violet-400',bg: 'bg-violet-500/10',icon: <Presentation className="w-3 h-3" /> },
  lainnya: { label: 'Lainnya', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10',  icon: <LayoutGrid className="w-3 h-3" /> },
}

// ── Zod Schema ─────────────────────────────────────────────────

const ruanganSchema = z.object({
  kode          : z.string().min(2, 'Kode minimal 2 karakter').max(20),
  nama          : z.string().min(3, 'Nama minimal 3 karakter').max(100),
  tipe          : z.string().optional().nullable(),
  kapasitas     : z.coerce.number().int().min(1).max(2000).optional().nullable().or(z.literal('')),
  gedung        : z.string().max(50).optional().nullable(),
  lantai        : z.coerce.number().int().min(1).max(50).optional().nullable().or(z.literal('')),
  koordinat_lat : z.coerce.number().min(-90).max(90).optional().nullable().or(z.literal('')),
  koordinat_lng : z.coerce.number().min(-180).max(180).optional().nullable().or(z.literal('')),
  keterangan    : z.string().optional().nullable(),
})

type RuanganForm = z.infer<typeof ruanganSchema>

// ── Helper Components ──────────────────────────────────────────

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
}: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
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

const selectCls = () => cn(
  'w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none',
  'focus:ring-2 focus:ring-ring/50 transition-all cursor-pointer appearance-none'
)

function TipeBadge({ tipe }: { tipe: string | null }) {
  if (!tipe) return <span className="text-xs text-muted-foreground/40">—</span>
  const cfg = TIPE_CONFIG[tipe]
  if (!cfg) return <span className="text-xs text-muted-foreground">{tipe}</span>
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
      cfg.color, cfg.bg
    )}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ── Inline Toggle ──────────────────────────────────────────────

function StatusToggle({ ruangan }: { ruangan: Ruangan }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (val: boolean) => toggleRuangan(ruangan.id, val),
    onSuccess : (res, val) => {
      toast.success(res.message)
      qc.setQueryData(['admin-ruangan'], (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const data = old as { items: Ruangan[] }
        return {
          ...data,
          items: data.items.map(r =>
            r.id === ruangan.id ? { ...r, is_active: val } : r
          ),
        }
      })
      qc.invalidateQueries({ queryKey: ['admin-ruangan'] })
      qc.invalidateQueries({ queryKey: ['admin-ruangan-stats'] })
    },
    onError: () => toast.error('Gagal mengubah status ruangan'),
  })

  return (
    <button
      onClick={(e) => { e.stopPropagation(); mutation.mutate(!ruangan.is_active) }}
      disabled={mutation.isPending}
      className="flex items-center gap-1.5 transition-opacity disabled:opacity-50"
      title={ruangan.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
    >
      {ruangan.is_active ? (
        <ToggleRight className="w-5 h-5 text-green-500" />
      ) : (
        <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />
      )}
      {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
    </button>
  )
}

// ── Modal: Form Tambah / Edit ──────────────────────────────────

function ModalFormRuangan({
  ruangan,
  onClose,
}: {
  ruangan?: Ruangan
  onClose : () => void
}) {
  const isEdit = !!ruangan
  const qc     = useQueryClient()
  const [activeTab, setActiveTab] = useState<'info' | 'lokasi'>('info')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RuanganForm>({
    resolver     : zodResolver(ruanganSchema),
    defaultValues: ruangan ? {
      kode         : ruangan.kode,
      nama         : ruangan.nama,
      tipe         : ruangan.tipe ?? '',
      kapasitas    : ruangan.kapasitas ?? undefined,
      gedung       : ruangan.gedung ?? '',
      lantai       : ruangan.lantai ?? undefined,
      koordinat_lat: ruangan.koordinat_lat ?? undefined,
      koordinat_lng: ruangan.koordinat_lng ?? undefined,
      keterangan   : ruangan.keterangan ?? '',
    } : {},
  })

  const lat = watch('koordinat_lat')
  const lng = watch('koordinat_lng')

  const tabErrors = {
    info  : !!(errors.kode || errors.nama || errors.tipe || errors.kapasitas || errors.gedung || errors.lantai),
    lokasi: !!(errors.koordinat_lat || errors.koordinat_lng),
  }

  const mutation = useMutation({
    mutationFn: (data: RuanganForm) => {
      const payload = {
        ...data,
        kode         : data.kode.trim().toUpperCase(),
        tipe         : data.tipe || null,
        kapasitas    : data.kapasitas ? Number(data.kapasitas) : null,
        gedung       : data.gedung || null,
        lantai       : data.lantai ? Number(data.lantai) : null,
        koordinat_lat: data.koordinat_lat ? Number(data.koordinat_lat) : null,
        koordinat_lng: data.koordinat_lng ? Number(data.koordinat_lng) : null,
        keterangan   : data.keterangan || null,
      }
      return isEdit
        ? updateRuangan(ruangan!.id, payload)
        : createRuangan(payload)
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-ruangan'] })
      qc.invalidateQueries({ queryKey: ['admin-ruangan-stats'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Terjadi kesalahan'
      toast.error(msg)
    },
  })

  const TABS = [
    { id: 'info',   label: 'Info Dasar', icon: <Info className="w-3.5 h-3.5" /> },
    { id: 'lokasi', label: 'Lokasi GPS', icon: <Map className="w-3.5 h-3.5" /> },
  ]

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
              <Building2 className={cn('w-4.5 h-4.5', isEdit ? 'text-amber-500' : 'text-primary')} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isEdit ? 'Edit Ruangan' : 'Tambah Ruangan'}
              </h2>
              {isEdit && <p className="text-[11px] text-muted-foreground font-mono">{ruangan!.kode}</p>}
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
                  onClick={() => setActiveTab(tab.id as 'info' | 'lokasi')}
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

            {/* Tab: Info Dasar */}
            {activeTab === 'info' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <FormField label="Kode" error={errors.kode?.message} required>
                      <input
                        {...register('kode')}
                        placeholder="LABRPL"
                        className={cn(inputCls(!!errors.kode), 'uppercase')}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </FormField>
                  </div>
                  <div className="col-span-2">
                    <FormField label="Tipe Ruangan">
                      <select {...register('tipe')} className={selectCls()}>
                        <option value="">— Pilih tipe —</option>
                        {TIPE_LIST.map(t => (
                          <option key={t} value={t}>{TIPE_CONFIG[t]?.label ?? t}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </div>

                <FormField label="Nama Ruangan" error={errors.nama?.message} required>
                  <input
                    {...register('nama')}
                    placeholder="Lab Rekayasa Perangkat Lunak"
                    className={inputCls(!!errors.nama)}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Gedung" error={errors.gedung?.message}>
                    <input {...register('gedung')} placeholder="Gedung J" className={inputCls(!!errors.gedung)} />
                  </FormField>
                  <FormField label="Lantai" error={errors.lantai?.message}>
                    <input {...register('lantai')} type="number" min={1} max={50} placeholder="1" className={inputCls(!!errors.lantai)} />
                  </FormField>
                </div>

                <FormField label="Kapasitas (kursi)" error={errors.kapasitas?.message}>
                  <input {...register('kapasitas')} type="number" min={1} max={2000} placeholder="40" className={inputCls(!!errors.kapasitas)} />
                </FormField>

                <FormField label="Keterangan">
                  <textarea
                    {...register('keterangan')}
                    placeholder="AC, proyektor, kapasitas 40 kursi..."
                    rows={2}
                    className={cn(inputCls(), 'h-auto py-2 resize-none')}
                  />
                </FormField>
              </>
            )}

            {/* Tab: Lokasi GPS */}
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
                      type="number" step="any"
                      placeholder="-5.130245"
                      className={inputCls(!!errors.koordinat_lat)}
                    />
                  </FormField>
                  <FormField label="Longitude" error={errors.koordinat_lng?.message}>
                    <input
                      {...register('koordinat_lng')}
                      type="number" step="any"
                      placeholder="119.489432"
                      className={inputCls(!!errors.koordinat_lng)}
                    />
                  </FormField>
                </div>

                {/* Maps preview */}
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
                        target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />Buka Maps
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
                    <span className="font-semibold text-foreground">Tips:</span> Buka Google Maps → klik kanan lokasi gedung → salin koordinat yang muncul.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <button
              type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit" disabled={mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isEdit ? 'Simpan Perubahan' : 'Buat Ruangan'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── Modal: Konfirmasi Hapus ────────────────────────────────────

function ModalHapus({ ruangan, onClose }: { ruangan: Ruangan; onClose: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteRuangan(ruangan.id),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-ruangan'] })
      qc.invalidateQueries({ queryKey: ['admin-ruangan-stats'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal menghapus ruangan'
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
          <h2 className="text-base font-semibold text-foreground">Hapus Ruangan?</h2>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {ruangan.kode} — {ruangan.nama}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ruangan yang sedang dipakai di jadwal matakuliah tidak bisa dihapus.
              Pastikan ruangan ini sudah tidak digunakan.
            </p>
          </div>
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

// ── Skeleton Row ───────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[8, 14, 30, 12, 12, 14, 10, 8, 8].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${w * 6}px`, maxWidth: '100%' }} />
        </td>
      ))}
    </tr>
  )
}

// ── Modal State ────────────────────────────────────────────────

type ModalState =
  | { type: 'tambah' }
  | { type: 'edit';  ruangan: Ruangan }
  | { type: 'hapus'; ruangan: Ruangan }
  | null

// ── Main Page ──────────────────────────────────────────────────

export default function RuanganPage() {
  const [modal, setModal]     = useState<ModalState>(null)
  const [search, setSearch]   = useState('')
  const [filterTipe, setFilterTipe] = useState('')
  const [page, setPage]       = useState(1)
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
    queryKey : ['admin-ruangan', debouncedSearch, filterTipe, page],
    queryFn  : () => fetchRuangan({
      search: debouncedSearch || undefined,
      tipe  : filterTipe || undefined,
      page,
      limit : 20,
    }),
    staleTime: 30_000,
  })

  // Stats dari data yang sudah ada (hitung dari items yang di-load)
  const statsFromData = {
    total  : data?.total ?? 0,
    aktif  : (data?.items ?? []).filter(r => r.is_active).length,
    lab    : (data?.items ?? []).filter(r => r.tipe === 'lab').length,
    kuliah : (data?.items ?? []).filter(r => r.tipe === 'kuliah').length,
    seminar: (data?.items ?? []).filter(r => r.tipe === 'seminar').length,
  }

  const closeModal = () => setModal(null)

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ruangan Kuliah</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola ruangan, lab, dan aula — lengkap dengan koordinat GPS untuk validasi presensi offline.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'tambah' })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Ruangan
        </button>
      </div>

      {/* ── Stat Strip ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Ruangan', value: data?.total ?? 0,     icon: <Building2 className="w-4 h-4 text-primary" />,         bg: 'bg-primary/10' },
          { label: 'Aktif',         value: statsFromData.aktif,  icon: <Building2 className="w-4 h-4 text-green-500" />,       bg: 'bg-green-500/10' },
          { label: 'Ruang Kuliah',  value: statsFromData.kuliah, icon: <School className="w-4 h-4 text-blue-500" />,           bg: 'bg-blue-500/10' },
          { label: 'Lab',           value: statsFromData.lab,    icon: <FlaskConical className="w-4 h-4 text-green-500" />,    bg: 'bg-green-500/10' },
          { label: 'Seminar/Aula',  value: statsFromData.seminar,icon: <Presentation className="w-4 h-4 text-violet-500" />,  bg: 'bg-violet-500/10' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', s.bg)}>
              {s.icon}
            </div>
            <div>
              {isLoading
                ? <div className="h-5 w-8 rounded bg-muted animate-pulse" />
                : <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>}
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari kode, nama, atau gedung..."
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
          {search && (
            <button onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tipe */}
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/30">
          {['', ...TIPE_LIST].map((tipe) => (
            <button
              key={tipe}
              onClick={() => { setFilterTipe(tipe); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                filterTipe === tipe
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tipe === '' ? 'Semua' : TIPE_CONFIG[tipe]?.label ?? tipe}
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>

        {data && (
          <p className="text-xs text-muted-foreground ml-auto">
            {data.total} ruangan
          </p>
        )}
      </div>

      {/* ── Tabel ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-8">No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nama Ruangan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-24">Tipe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-20 hidden md:table-cell">Kapasitas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Gedung & Lantai</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-16 hidden xl:table-cell">GPS</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-20">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="w-8 h-8 opacity-30" />
                      <p className="text-sm">
                        {debouncedSearch || filterTipe
                          ? 'Tidak ada ruangan yang cocok dengan filter'
                          : 'Belum ada data ruangan'}
                      </p>
                      {!debouncedSearch && !filterTipe && (
                        <button
                          onClick={() => setModal({ type: 'tambah' })}
                          className="text-xs text-primary hover:underline"
                        >
                          + Tambah ruangan pertama
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors group">
                    {/* No */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(page - 1) * 20 + idx + 1}
                    </td>

                    {/* Kode */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono',
                        r.is_active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {r.kode}
                      </span>
                    </td>

                    {/* Nama */}
                    <td className="px-4 py-3">
                      <p className={cn('text-sm font-medium', r.is_active ? 'text-foreground' : 'text-muted-foreground')}>
                        {r.nama}
                      </p>
                      {r.keterangan && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={r.keterangan}>
                          {r.keterangan}
                        </p>
                      )}
                    </td>

                    {/* Tipe */}
                    <td className="px-4 py-3">
                      <TipeBadge tipe={r.tipe} />
                    </td>

                    {/* Kapasitas */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {r.kapasitas ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {r.kapasitas}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Gedung & Lantai */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(r.gedung || r.lantai) ? (
                        <div>
                          {r.gedung && <p className="text-xs font-medium text-foreground">{r.gedung}</p>}
                          {r.lantai && <p className="text-[11px] text-muted-foreground">Lantai {r.lantai}</p>}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* GPS Badge */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {r.koordinat_lat ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-semibold">
                          <MapPin className="w-2.5 h-2.5" />
                          GPS
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-3">
                      <StatusToggle ruangan={r} />
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ type: 'edit', ruangan: r })}
                          title="Edit"
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'hapus', ruangan: r })}
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
              Halaman {page} dari {data.total_pages} · {data.total} ruangan
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(data.total_pages, 5) }).map((_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      page === p ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      {modal?.type === 'tambah' && <ModalFormRuangan onClose={closeModal} />}
      {modal?.type === 'edit'   && <ModalFormRuangan ruangan={modal.ruangan} onClose={closeModal} />}
      {modal?.type === 'hapus'  && <ModalHapus ruangan={modal.ruangan} onClose={closeModal} />}
    </div>
  )
}