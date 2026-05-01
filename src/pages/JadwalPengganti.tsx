import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Calendar, Trash2, RefreshCw, Search, X, Loader2,
  AlertTriangle, Info, Clock, MapPin, GraduationCap,
  BookOpen, ChevronDown, Filter,
} from 'lucide-react'
import {
  fetchJadwalPengganti, deleteJadwalPengganti,
} from '@/api/jadwal_pengganti.api'
import { fetchMatakuliah } from '@/api/matakuliah.api'
import { fetchUsers } from '@/api/users.api'
import type { JadwalPengganti } from '@/api/jadwal_pengganti.api'
import { cn } from '@/lib/utils'

// ── Helper: format tanggal Indonesia ─────────────────────────

function fmtTgl(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day  : '2-digit',
    month: 'short',
    year : 'numeric',
  })
}

// ── Komponen: Info Tooltip Banner ────────────────────────────

function InfoBanner() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Tentang Jadwal Pengganti
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Jadwal pengganti dibuat oleh dosen dari aplikasi mobile untuk mengubah
          jam atau ruangan di pertemuan tertentu. Sistem scheduler otomatis
          membaca jadwal pengganti ini saat menutup sesi — jika ada jadwal
          pengganti untuk pertemuan tersebut, jam <strong className="text-foreground">jam_selesai_baru</strong>{' '}
          digunakan sebagai pengganti jam reguler matakuliah. Hapus hanya jika
          ada data yang keliru.
        </p>
      </div>
      <button
        onClick={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Komponen: Modal Konfirmasi Hapus ─────────────────────────

function ModalKonfirmasiHapus({
  item,
  onClose,
}: {
  item   : JadwalPengganti
  onClose: () => void
}) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteJadwalPengganti(item.id),
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['admin-jadwal-pengganti'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Gagal menghapus jadwal pengganti'
      toast.error(msg)
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
        {/* Icon + judul */}
        <div className="text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Hapus Jadwal Pengganti?
          </h2>
        </div>

        {/* Detail item yang dihapus */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-semibold text-foreground">
              {item.kode_mk} — {item.nama_matakuliah}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">{item.nama_dosen}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              Pertemuan ke-{item.pertemuan_ke}
            </span>
          </div>
          {item.keterangan && (
            <p className="text-[11px] text-muted-foreground italic border-t border-border pt-2 mt-2">
              "{item.keterangan}"
            </p>
          )}
        </div>

        {/* Peringatan scheduler */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 mb-4 flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Setelah dihapus, scheduler akan kembali menggunakan jam reguler
            matakuliah untuk pertemuan ini.
          </p>
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
            {mutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Komponen: Filter Dropdown ────────────────────────────────

function FilterDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label      : string
  value      : string
  onChange   : (v: string) => void
  options    : { id: string; label: string }[]
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'h-9 w-full rounded-lg border border-border bg-background pl-3 pr-8',
            'text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all',
            'appearance-none cursor-pointer',
            !value && 'text-muted-foreground'
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}

// ── Komponen: Badge perubahan ─────────────────────────────────

function ChangeBadge({
  icon,
  label,
  value,
}: {
  icon : React.ReactNode
  label: string
  value: string | null
}) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

// ── Skeleton Row ──────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[24, 40, 28, 18, 18, 16, 40, 20, 10].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded bg-muted animate-pulse"
            style={{ width: `${w * 4}px`, maxWidth: '100%' }}
          />
        </td>
      ))}
    </tr>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────

export default function JadwalPengganti() {
  const [hapusTarget, setHapusTarget] = useState<JadwalPengganti | null>(null)
  const [filterMk, setFilterMk]       = useState('')
  const [filterDosen, setFilterDosen] = useState('')
  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    clearTimeout(
      (handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t
    )
    ;(
      handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> }
    )._t = setTimeout(() => setDebouncedSearch(val), 400)
  }, [])

  // ── Query: data jadwal pengganti ──────────────────────────
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey : ['admin-jadwal-pengganti', filterMk, filterDosen],
    queryFn  : () =>
      fetchJadwalPengganti({
        matakuliah_id: filterMk   || undefined,
        dosen_id     : filterDosen || undefined,
      }),
    staleTime: 30_000,
  })

  // ── Query: options filter matakuliah ──────────────────────
  const { data: mkData } = useQuery({
    queryKey : ['admin-matakuliah-filter'],
    queryFn  : () => fetchMatakuliah({ limit: 100 }),
    staleTime: 5 * 60_000,
  })

  // ── Query: options filter dosen ───────────────────────────
  const { data: dosenData } = useQuery({
    queryKey : ['admin-dosen-filter'],
    queryFn  : () => fetchUsers({ role: 'dosen', limit: 100 }),
    staleTime: 5 * 60_000,
  })

  // ── Filter lokal: search ──────────────────────────────────
  const filtered = (data?.items ?? []).filter((jp) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (
      jp.nama_matakuliah.toLowerCase().includes(q) ||
      jp.kode_mk.toLowerCase().includes(q) ||
      jp.nama_dosen.toLowerCase().includes(q) ||
      jp.nidn.toLowerCase().includes(q) ||
      (jp.ruangan_baru ?? '').toLowerCase().includes(q) ||
      (jp.keterangan ?? '').toLowerCase().includes(q)
    )
  })

  const mkOptions = (mkData?.items ?? []).map((mk) => ({
    id   : mk.id,
    label: `${mk.kode} — ${mk.nama}`,
  }))

  const dosenOptions = (dosenData?.items ?? []).map((d) => ({
    id   : d.id,
    label: d.nama_lengkap,
  }))

  const hasFilter = !!filterMk || !!filterDosen || !!debouncedSearch

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jadwal Pengganti</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitoring jadwal pengganti yang dibuat dosen — lihat dan hapus jika ada yang keliru.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Info Banner ────────────────────────────────── */}
      <InfoBanner />

      {/* ── Stats Strip ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Jadwal Pengganti',
            value: data?.total ?? 0,
            icon : <Calendar className="w-4 h-4 text-blue-500" />,
            bg   : 'bg-blue-500/10',
          },
          {
            label: 'Dengan Jam Baru',
            value: (data?.items ?? []).filter(
              (jp) => jp.jam_mulai_baru || jp.jam_selesai_baru
            ).length,
            icon : <Clock className="w-4 h-4 text-violet-500" />,
            bg   : 'bg-violet-500/10',
          },
          {
            label: 'Dengan Ruangan Baru',
            value: (data?.items ?? []).filter((jp) => jp.ruangan_baru).length,
            icon : <MapPin className="w-4 h-4 text-amber-500" />,
            bg   : 'bg-amber-500/10',
          },
          {
            label: 'Ditampilkan Sekarang',
            value: filtered.length,
            icon : <Filter className="w-4 h-4 text-green-500" />,
            bg   : 'bg-green-500/10',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3"
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              stat.bg
            )}>
              {stat.icon}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Panel ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filter & Pencarian</span>
          {hasFilter && (
            <button
              onClick={() => {
                setFilterMk('')
                setFilterDosen('')
                handleSearch('')
              }}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Reset filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filter matakuliah */}
          <FilterDropdown
            label="Matakuliah"
            value={filterMk}
            onChange={setFilterMk}
            options={mkOptions}
            placeholder="Semua matakuliah"
          />

          {/* Filter dosen */}
          <FilterDropdown
            label="Dosen"
            value={filterDosen}
            onChange={setFilterDosen}
            options={dosenOptions}
            placeholder="Semua dosen"
          />

          {/* Search teks */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Pencarian
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari matakuliah, dosen, ruangan..."
                className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-all"
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
          </div>
        </div>
      </div>

      {/* ── Tabel ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-8">
                  No
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Matakuliah
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                  Dosen
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-24">
                  Pertemuan
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Perubahan
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">
                  Keterangan
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell w-28">
                  Dibuat
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground w-20">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                      <Calendar className="w-9 h-9 opacity-25" />
                      <p className="text-sm font-medium">
                        {hasFilter
                          ? 'Tidak ada jadwal pengganti yang cocok dengan filter'
                          : 'Belum ada jadwal pengganti yang dibuat dosen'}
                      </p>
                      {hasFilter && (
                        <button
                          onClick={() => {
                            setFilterMk('')
                            setFilterDosen('')
                            handleSearch('')
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Reset semua filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((jp, idx) => (
                  <tr
                    key={jp.id}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    {/* No */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {idx + 1}
                    </td>

                    {/* Matakuliah */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold font-mono flex-shrink-0">
                          {jp.kode_mk}
                        </span>
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {jp.nama_matakuliah}
                        </p>
                      </div>
                    </td>

                    {/* Dosen */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm text-foreground">{jp.nama_dosen}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {jp.nidn}
                      </p>
                    </td>

                    {/* Pertemuan ke */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold text-foreground">
                        {jp.pertemuan_ke}
                      </span>
                    </td>

                    {/* Perubahan */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        {(jp.jam_mulai_baru || jp.jam_selesai_baru) && (
                          <ChangeBadge
                            icon={<Clock className="w-3 h-3" />}
                            label="Jam"
                            value={[jp.jam_mulai_baru, jp.jam_selesai_baru]
                              .filter(Boolean)
                              .join(' – ')}
                          />
                        )}
                        {jp.ruangan_baru && (
                          <ChangeBadge
                            icon={<MapPin className="w-3 h-3" />}
                            label="Ruangan"
                            value={jp.ruangan_baru}
                          />
                        )}
                        {!jp.jam_mulai_baru && !jp.jam_selesai_baru && !jp.ruangan_baru && (
                          <span className="text-[11px] text-muted-foreground/50 italic">
                            Hanya keterangan
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Keterangan */}
                    <td className="px-4 py-3 hidden xl:table-cell max-w-[200px]">
                      {jp.keterangan ? (
                        <p
                          className="text-xs text-muted-foreground truncate"
                          title={jp.keterangan}
                        >
                          {jp.keterangan}
                        </p>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Dibuat */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {fmtTgl(jp.created_at)}
                      </p>
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setHapusTarget(jp)}
                        className={cn(
                          'h-7 px-2.5 rounded-lg border border-border text-xs',
                          'text-muted-foreground hover:text-red-500',
                          'hover:border-red-500/30 hover:bg-red-500/5',
                          'transition-colors opacity-0 group-hover:opacity-100',
                          'flex items-center gap-1 ml-auto'
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {data?.total ?? 0} jadwal pengganti
            </p>
            {hasFilter && (
              <p className="text-xs text-muted-foreground">
                Filter aktif
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Hapus ────────────────────────────────── */}
      {hapusTarget && (
        <ModalKonfirmasiHapus
          item={hapusTarget}
          onClose={() => setHapusTarget(null)}
        />
      )}
    </div>
  )
}