import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BookOpen, Users, UserCheck, UserX, Search,
  ChevronRight, X, Loader2, RefreshCw, Trash2,
  UserPlus, UsersRound, AlertTriangle, CheckCircle2,
  GraduationCap, Clock, ShieldCheck, ShieldAlert,
  LayoutList, ChevronDown, ChevronUp,
} from 'lucide-react'
import { fetchMatakuliah } from '@/api/matakuliah.api'
import {
  getMahasiswaMatakuliah, enrollMahasiswa, enrollBulk,
  unenrollMahasiswa, hapusTamu,
} from '@/api/enrollment.api'
import {
  fetchMahasiswaKelas,
} from '@/api/kelas.api'
import { fetchKelas } from '@/api/kelas.api'
import { fetchUsers } from '@/api/users.api'
import type { AdminMatakuliah } from '@/api/matakuliah.api'
import type { MahasiswaEnrolled } from '@/api/enrollment.api'
import type { AdminUser } from '@/api/users.api'
import type { KelasMatakuliah, MahasiswaKelasItem } from '@/api/kelas.api'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────

const HARI_COLOR: Record<string, string> = {
  Senin  : 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Selasa : 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  Rabu   : 'bg-green-500/10 text-green-500 border-green-500/20',
  Kamis  : 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Jumat  : 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  Sabtu  : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  Minggu : 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

// ── Sub-Components ────────────────────────────────────────────

function Badge({
  children, variant,
}: {
  children: React.ReactNode
  variant : 'success' | 'warning' | 'danger' | 'muted' | 'info' | 'tamu'
}) {
  const cls = {
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger : 'bg-red-500/10 text-red-600 dark:text-red-400',
    muted  : 'bg-muted text-muted-foreground',
    info   : 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    tamu   : 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  }[variant]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold', cls)}>
      {children}
    </span>
  )
}

// ── Modal: Tambah Mahasiswa ke Kelas ─────────────────────────

function ModalTambahMahasiswaKelas({
  kelasId,
  kelasLabel,
  onClose,
}: {
  kelasId   : string
  kelasLabel: string
  onClose   : () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(val)
    }, 400)
  }

  const { data: kelasData } = useQuery({
    queryKey : ['kelas-mhs', kelasId],
    queryFn  : () => fetchMahasiswaKelas(kelasId),
    staleTime: 10_000,
  })

  const enrolledIds = new Set([
    ...(kelasData?.mahasiswa_asli ?? []).map(m => m.mahasiswa_id),
    ...(kelasData?.mahasiswa_tamu ?? []).map(m => m.mahasiswa_id),
  ])

  const { data, isLoading } = useQuery({
    queryKey : ['enroll-kelas-search', debouncedSearch],
    queryFn  : () => fetchUsers({ role: 'mahasiswa', search: debouncedSearch || undefined, limit: 30 }),
    staleTime: 10_000,
  })

  // Gunakan enroll-bulk ke kelas via endpoint kelas jika ada,
  // atau fallback ke enrollBulk matakuliah (backward compat)
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected)
      if (ids.length === 1) {
        return enrollMahasiswa(kelasId, ids[0])
      }
      return enrollBulk(kelasId, ids)
    },
    onSuccess: (res) => {
      const msg = 'message' in res ? res.message : (res as { message: string }).message
      toast.success(msg)
      qc.invalidateQueries({ queryKey: ['kelas-mhs', kelasId] })
      qc.invalidateQueries({ queryKey: ['kelas'] })
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal mendaftarkan'
      toast.error(msg)
    },
  })

  const available = (data?.items ?? []).filter(m => !enrolledIds.has(m.id))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tambah Mahasiswa</h2>
              <p className="text-[11px] text-muted-foreground">{kelasLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Cari NIM atau nama..." autoFocus
              className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
          {selected.size > 0 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{selected.size} mahasiswa dipilih</p>
              <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                Hapus pilihan
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-sm">{debouncedSearch ? 'Tidak ada mahasiswa ditemukan' : 'Semua mahasiswa sudah terdaftar'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {available.map(mhs => {
                const isSelected = selected.has(mhs.id)
                return (
                  <button key={mhs.id} onClick={() => setSelected(prev => {
                    const next = new Set(prev)
                    if (next.has(mhs.id)) next.delete(mhs.id)
                    else next.add(mhs.id)
                    return next
                  })}
                    className={cn('w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30')}>
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected ? 'bg-primary border-primary' : 'border-border')}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-primary">{mhs.nama_lengkap[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{mhs.nama_lengkap}</p>
                      <p className="text-[11px] text-muted-foreground">{mhs.nim_nidn} · {mhs.program_studi}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Batal</button>
          <button onClick={() => enrollMutation.mutate()} disabled={selected.size === 0 || enrollMutation.isPending}
            className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {enrollMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Daftarkan {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Tambah Mahasiswa (Legacy — per MK tanpa kelas) ─────

function ModalTambahMahasiswaLegacy({
  mkId, mkNama, enrolledIds, onClose,
}: {
  mkId       : string
  mkNama     : string
  enrolledIds: Set<string>
  onClose    : () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setDebouncedSearch(val), 400)
  }

  const { data, isLoading } = useQuery({
    queryKey : ['enroll-search', debouncedSearch],
    queryFn  : () => fetchUsers({ role: 'mahasiswa', search: debouncedSearch || undefined, limit: 30 }),
    staleTime: 10_000,
  })

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected)
      return ids.length === 1 ? enrollMahasiswa(mkId, ids[0]) : enrollBulk(mkId, ids)
    },
    onSuccess: (res) => {
      toast.success('message' in res ? res.message : (res as { message: string }).message)
      qc.invalidateQueries({ queryKey: ['enrollment', mkId] })
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
      onClose()
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal mendaftarkan')
    },
  })

  const available = (data?.items ?? []).filter(m => !enrolledIds.has(m.id))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tambah Mahasiswa (Legacy)</h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{mkNama}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Cari NIM atau nama..." autoFocus
              className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-sm">Tidak ada mahasiswa tersedia</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {available.map(mhs => {
                const isSelected = selected.has(mhs.id)
                return (
                  <button key={mhs.id} onClick={() => setSelected(prev => {
                    const next = new Set(prev)
                    if (next.has(mhs.id)) next.delete(mhs.id); else next.add(mhs.id)
                    return next
                  })} className={cn('w-full flex items-center gap-3 px-5 py-3 text-left transition-colors', isSelected ? 'bg-primary/5' : 'hover:bg-muted/30')}>
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0', isSelected ? 'bg-primary border-primary' : 'border-border')}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-primary">{mhs.nama_lengkap[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{mhs.nama_lengkap}</p>
                      <p className="text-[11px] text-muted-foreground">{mhs.nim_nidn} · {mhs.program_studi}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">Batal</button>
          <button onClick={() => enrollMutation.mutate()} disabled={selected.size === 0 || enrollMutation.isPending}
            className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {enrollMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Daftarkan {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Konfirmasi Hapus ───────────────────────────────────

function ModalKonfirmasiHapus({
  mahasiswa, isTamu, mkId, mkNama, onClose,
}: {
  mahasiswa: MahasiswaEnrolled
  isTamu   : boolean
  mkId     : string
  mkNama   : string
  onClose  : () => void
}) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => isTamu ? hapusTamu(mkId, mahasiswa.mahasiswa_id) : unenrollMahasiswa(mkId, mahasiswa.mahasiswa_id),
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['enrollment', mkId] })
      qc.invalidateQueries({ queryKey: ['admin-matakuliah'] })
      onClose()
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal menghapus')
    },
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
        <div className="text-center space-y-3 mb-5">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mx-auto', isTamu ? 'bg-violet-500/10' : 'bg-red-500/10')}>
            <AlertTriangle className={cn('w-6 h-6', isTamu ? 'text-violet-500' : 'text-red-500')} />
          </div>
          <h2 className="text-base font-semibold text-foreground">{isTamu ? 'Hapus Akses Tamu?' : 'Hapus Enrollment?'}</h2>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{mahasiswa.nama_lengkap}</p>
            <p className="text-xs text-muted-foreground">{mahasiswa.nim} · {mahasiswa.program_studi}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isTamu ? `Akses tamu di ${mkNama} akan dicabut. Riwayat presensi tetap tersimpan.`
              : `Mahasiswa ini akan dikeluarkan dari ${mkNama}. Tindakan ini tidak bisa dibatalkan.`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">Batal</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className={cn('flex-1 h-9 rounded-lg text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5',
              isTamu ? 'bg-violet-600 hover:bg-violet-700' : 'bg-red-600 hover:bg-red-700')}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sheet: Enrollment per Kelas (Fase B) ──────────────────────

function SheetEnrollmentKelas({
  mk, kelas, onClose,
}: {
  mk     : AdminMatakuliah
  kelas  : KelasMatakuliah
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'asli' | 'tamu'>('asli')
  const [searchAsli, setSearchAsli] = useState('')
  const [searchTamu, setSearchTamu] = useState('')
  const [showTambah, setShowTambah] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey : ['kelas-mhs', kelas.id],
    queryFn  : () => fetchMahasiswaKelas(kelas.id),
    staleTime: 30_000,
  })

  const filterMhs = (list: MahasiswaKelasItem[], q: string) => {
    if (!q) return list
    const lower = q.toLowerCase()
    return list.filter(m =>
      m.nim.toLowerCase().includes(lower) ||
      m.nama_lengkap.toLowerCase().includes(lower) ||
      m.program_studi.toLowerCase().includes(lower)
    )
  }

  const filteredAsli = filterMhs(data?.mahasiswa_asli ?? [], searchAsli)
  const filteredTamu = filterMhs(data?.mahasiswa_tamu ?? [], searchTamu)

  const kelasLabel = `${mk.kode} — Kelas ${kelas.kode_kelas}`

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-[60] w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">{mk.kode}</span>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">{kelas.kode_kelas}</span>
              {kelas.hari && (
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold',
                  HARI_COLOR[kelas.hari] ?? 'bg-muted text-muted-foreground border-border')}>
                  {kelas.hari}{kelas.jam_range ? ` · ${kelas.jam_range}` : ''}
                </span>
              )}
              {kelas.izin_tamu && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-[11px] font-semibold border border-green-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" />Izin Tamu
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground mt-1 truncate">{mk.nama}</h2>
            {kelas.nama_dosen && (
              <p className="text-xs text-muted-foreground mt-0.5">{kelas.nama_dosen}</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{isLoading ? '—' : (data?.total_asli ?? 0) + (data?.total_tamu ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Total Enrolled</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{isLoading ? '—' : data?.total_asli ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Mahasiswa Asli</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-violet-500">{isLoading ? '—' : data?.total_tamu ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Mahasiswa Tamu</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {[
            { id: 'asli', label: 'Mahasiswa Asli', icon: <UserCheck className="w-3.5 h-3.5" />, count: data?.total_asli ?? 0 },
            { id: 'tamu', label: 'Mahasiswa Tamu', icon: <UsersRound className="w-3.5 h-3.5" />, count: data?.total_tamu ?? 0 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as 'asli' | 'tamu')}
              className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {tab.icon}{tab.label}
              {!isLoading && (
                <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-bold',
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'asli' && (
            <>
              <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={searchAsli} onChange={e => setSearchAsli(e.target.value)} placeholder="Cari NIM atau nama..."
                    className="w-full h-8 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
                </div>
                <button onClick={() => refetch()} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowTambah(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
                  <UserPlus className="w-3.5 h-3.5" />Tambah
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : filteredAsli.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                    <UserCheck className="w-8 h-8 opacity-30" />
                    <p className="text-sm">{searchAsli ? 'Tidak ada hasil' : 'Belum ada mahasiswa terdaftar'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredAsli.map(mhs => (
                      <MahasiswaKelasRow key={mhs.mahasiswa_id} mhs={mhs} isTamu={false} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'tamu' && (
            <>
              {kelas.izin_tamu ? (
                <div className="flex items-start gap-2 px-6 py-2.5 bg-green-500/5 border-b border-green-500/20 flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                    Izin tamu aktif — mahasiswa dari kelas lain dapat presensi otomatis dan tercatat di sini.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 px-6 py-2.5 bg-amber-500/5 border-b border-amber-500/20 flex-shrink-0">
                  <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Izin tamu nonaktif — hanya tamu yang ditambahkan manual dosen yang bisa presensi.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={searchTamu} onChange={e => setSearchTamu(e.target.value)} placeholder="Cari NIM, nama, atau kelas asal..."
                    className="w-full h-8 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
                </div>
                <button onClick={() => refetch()} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : filteredTamu.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                    <UsersRound className="w-8 h-8 opacity-30" />
                    <p className="text-sm">{searchTamu ? 'Tidak ada hasil' : 'Belum ada mahasiswa tamu'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredTamu.map(mhs => (
                      <MahasiswaKelasRow key={mhs.mahasiswa_id} mhs={mhs} isTamu={true} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showTambah && (
        <ModalTambahMahasiswaKelas
          kelasId={kelas.id}
          kelasLabel={kelasLabel}
          onClose={() => setShowTambah(false)}
        />
      )}
    </>
  )
}

// ── Mahasiswa Row (per Kelas) ─────────────────────────────────

function MahasiswaKelasRow({
  mhs, isTamu,
}: {
  mhs    : MahasiswaKelasItem
  isTamu : boolean
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors group">
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border',
        isTamu ? 'bg-violet-500/10 border-violet-500/20' : 'bg-primary/10 border-primary/20')}>
        <span className={cn('text-[12px] font-bold', isTamu ? 'text-violet-500' : 'text-primary')}>
          {mhs.nama_lengkap[0]?.toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{mhs.nama_lengkap}</p>
          {!mhs.is_active && <Badge variant="muted">Nonaktif</Badge>}
        </div>
        <p className="text-[11px] text-muted-foreground">{mhs.nim} · {mhs.program_studi}</p>
        {isTamu && mhs.kelas_asal && (
          <p className="text-[11px] text-violet-500 dark:text-violet-400 flex items-center gap-1 mt-0.5">
            <GraduationCap className="w-2.5 h-2.5" />Dari: {mhs.kelas_asal}
          </p>
        )}
      </div>
      {mhs.enrolled_at && (
        <p className="text-[10px] text-muted-foreground hidden sm:block flex-shrink-0">
          {new Date(mhs.enrolled_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
        </p>
      )}
    </div>
  )
}

// ── Sheet: Enrollment Legacy (per MK, tanpa kelas) ────────────

function SheetEnrollmentLegacy({
  mk, onClose,
}: {
  mk     : AdminMatakuliah
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'asli' | 'tamu'>('asli')
  const [searchAsli, setSearchAsli] = useState('')
  const [searchTamu, setSearchTamu] = useState('')
  const [showTambah, setShowTambah] = useState(false)
  const [hapusTarget, setHapusTarget] = useState<{ mahasiswa: MahasiswaEnrolled; isTamu: boolean } | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey : ['enrollment', mk.id],
    queryFn  : () => getMahasiswaMatakuliah(mk.id),
    staleTime: 30_000,
  })

  const allEnrolledIds = new Set([
    ...(data?.mahasiswa_asli ?? []).map(m => m.mahasiswa_id),
    ...(data?.mahasiswa_tamu ?? []).map(m => m.mahasiswa_id),
  ])

  const filterMhs = (list: MahasiswaEnrolled[], q: string) => {
    if (!q) return list
    const lower = q.toLowerCase()
    return list.filter(m =>
      m.nim.toLowerCase().includes(lower) ||
      m.nama_lengkap.toLowerCase().includes(lower) ||
      m.program_studi.toLowerCase().includes(lower)
    )
  }

  const filteredAsli = filterMhs(data?.mahasiswa_asli ?? [], searchAsli)
  const filteredTamu = filterMhs(data?.mahasiswa_tamu ?? [], searchTamu)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">{mk.kode}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[11px] font-semibold">Legacy (tanpa kelas)</span>
              {mk.izin_tamu && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-[11px] font-semibold border border-green-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" />Izin Tamu
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground mt-1 truncate">{mk.nama}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-border bg-muted/20 flex-shrink-0">
          {[
            { label: 'Total Enrolled', value: (data?.total_asli ?? 0) + (data?.total_tamu ?? 0) },
            { label: 'Mahasiswa Asli', value: data?.total_asli ?? 0 },
            { label: 'Mahasiswa Tamu', value: data?.total_tamu ?? 0 },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-foreground">{isLoading ? '—' : s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex border-b border-border flex-shrink-0">
          {[
            { id: 'asli', label: 'Mahasiswa Asli', count: data?.total_asli ?? 0 },
            { id: 'tamu', label: 'Mahasiswa Tamu', count: data?.total_tamu ?? 0 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as 'asli' | 'tamu')}
              className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {tab.label}
              {!isLoading && (
                <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-bold',
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'asli' && (
            <>
              <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={searchAsli} onChange={e => setSearchAsli(e.target.value)} placeholder="Cari NIM atau nama..."
                    className="w-full h-8 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
                </div>
                <button onClick={() => refetch()} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button onClick={() => setShowTambah(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
                  <UserPlus className="w-3.5 h-3.5" />Tambah
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  : filteredAsli.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                      <UserCheck className="w-8 h-8 opacity-30" />
                      <p className="text-sm">{searchAsli ? 'Tidak ada hasil' : 'Belum ada mahasiswa terdaftar'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredAsli.map(mhs => (
                        <LegacyMahasiswaRow key={mhs.mahasiswa_id} mhs={mhs} isTamu={false} onHapus={() => setHapusTarget({ mahasiswa: mhs, isTamu: false })} />
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}

          {activeTab === 'tamu' && (
            <>
              {!mk.izin_tamu && (
                <div className="flex items-start gap-2 px-6 py-2.5 bg-amber-500/5 border-b border-amber-500/20 flex-shrink-0">
                  <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">Izin tamu nonaktif.</p>
                </div>
              )}
              <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={searchTamu} onChange={e => setSearchTamu(e.target.value)} placeholder="Cari NIM, nama, atau kelas asal..."
                    className="w-full h-8 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
                </div>
                <button onClick={() => refetch()} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  : filteredTamu.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                      <UsersRound className="w-8 h-8 opacity-30" />
                      <p className="text-sm">{searchTamu ? 'Tidak ada hasil' : 'Belum ada mahasiswa tamu'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredTamu.map(mhs => (
                        <LegacyMahasiswaRow key={mhs.mahasiswa_id} mhs={mhs} isTamu={true} onHapus={() => setHapusTarget({ mahasiswa: mhs, isTamu: true })} />
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </div>

      {showTambah && (
        <ModalTambahMahasiswaLegacy mkId={mk.id} mkNama={mk.nama} enrolledIds={allEnrolledIds} onClose={() => setShowTambah(false)} />
      )}
      {hapusTarget && (
        <ModalKonfirmasiHapus mahasiswa={hapusTarget.mahasiswa} isTamu={hapusTarget.isTamu} mkId={mk.id} mkNama={mk.nama} onClose={() => setHapusTarget(null)} />
      )}
    </>
  )
}

function LegacyMahasiswaRow({ mhs, isTamu, onHapus }: { mhs: MahasiswaEnrolled; isTamu: boolean; onHapus: () => void }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors group">
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border',
        isTamu ? 'bg-violet-500/10 border-violet-500/20' : 'bg-primary/10 border-primary/20')}>
        <span className={cn('text-[12px] font-bold', isTamu ? 'text-violet-500' : 'text-primary')}>
          {mhs.nama_lengkap[0]?.toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{mhs.nama_lengkap}</p>
          {!mhs.is_active && <Badge variant="muted">Nonaktif</Badge>}
        </div>
        <p className="text-[11px] text-muted-foreground">{mhs.nim} · {mhs.program_studi}</p>
        {isTamu && mhs.kelas_asal && (
          <p className="text-[11px] text-violet-500 dark:text-violet-400 flex items-center gap-1 mt-0.5">
            <GraduationCap className="w-2.5 h-2.5" />Dari: {mhs.kelas_asal}
          </p>
        )}
      </div>
      {mhs.enrolled_at && (
        <p className="text-[10px] text-muted-foreground hidden sm:block flex-shrink-0">
          {new Date(mhs.enrolled_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
        </p>
      )}
      <button onClick={onHapus}
        className={cn('w-7 h-7 rounded-lg border flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100',
          isTamu ? 'border-violet-500/20 text-violet-400 hover:bg-violet-500/10' : 'border-red-500/20 text-red-400 hover:bg-red-500/10')}>
        {isTamu ? <UserX className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ── Matakuliah Card (multi-kelas Fase B) ──────────────────────

function MatakuliahCard({
  mk, onKelolaLegacy,
}: {
  mk            : AdminMatakuliah
  onKelolaLegacy: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [selectedKelas, setSelectedKelas] = useState<KelasMatakuliah | null>(null)

  const { data: kelasData, isLoading: kelasLoading } = useQuery({
    queryKey : ['kelas', mk.id],
    queryFn  : () => fetchKelas(mk.id),
    staleTime: 60_000,
    enabled  : expanded,
  })

  const hasKelas = (kelasData?.total_kelas ?? 0) > 0

  return (
    <>
      <div className="rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all flex flex-col">
        {/* Card Header */}
        <div className="p-4 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">{mk.kode}</span>
            {mk.sks && <span className="text-[11px] text-muted-foreground font-semibold">{mk.sks} SKS</span>}
            {mk.izin_tamu && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 text-[10px] font-semibold">
                <ShieldCheck className="w-2.5 h-2.5" />Izin Tamu
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-tight mb-2">{mk.nama}</h3>
          {(mk.hari || mk.ruangan) && (
            <div className="flex items-center gap-1.5 mb-2">
              {mk.hari && (
                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold',
                  HARI_COLOR[mk.hari] ?? 'bg-muted text-muted-foreground border-border')}>
                  {mk.hari}
                </span>
              )}
              {mk.jam_mulai && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" />{mk.jam_mulai}{mk.jam_selesai && ` – ${mk.jam_selesai}`}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{mk.total_mahasiswa}</span> terdaftar
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-4 pb-4 space-y-2">
          {/* Tombol expand kelas */}
          <button onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30 transition-all">
            <div className="flex items-center gap-1.5">
              <LayoutList className="w-3.5 h-3.5" />
              {kelasLoading && expanded ? 'Memuat kelas...' : `${kelasData?.total_kelas ?? 'Lihat'} Kelas`}
            </div>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Daftar kelas (expandable) */}
          {expanded && (
            <div className="space-y-1.5 pt-1">
              {kelasLoading ? (
                <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
              ) : hasKelas ? (
                kelasData!.kelas.map(k => (
                  <button key={k.id} onClick={() => setSelectedKelas(k)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-all text-left group">
                    <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0',
                      k.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      {k.kode_kelas}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {k.nama_dosen ?? <span className="text-muted-foreground/50">Dosen belum diset</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {k.hari ?? '—'}{k.jam_range ? ` · ${k.jam_range}` : ''} · {k.total_enrolled} mhs
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Belum ada kelas. Tambahkan di halaman Matakuliah.</p>
              )}

              {/* Legacy enrollment jika ada */}
              {(kelasData?.legacy_enrolled ?? 0) > 0 && (
                <button onClick={onKelolaLegacy}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-left">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 text-[9px] font-bold flex-shrink-0">
                    ?
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      {kelasData!.legacy_enrolled} enrollment lama (tanpa kelas)
                    </p>
                    <p className="text-[10px] text-amber-600/70">Klik untuk kelola</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* Legacy button jika tidak ada kelas sama sekali */}
          {!expanded && mk.total_mahasiswa > 0 && (
            <button onClick={onKelolaLegacy}
              className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              <Users className="w-3 h-3" />
              Kelola {mk.total_mahasiswa} mahasiswa (legacy)
            </button>
          )}
        </div>
      </div>

      {/* Sheet enrollment per kelas */}
      {selectedKelas && (
        <SheetEnrollmentKelas
          mk={mk}
          kelas={selectedKelas}
          onClose={() => setSelectedKelas(null)}
        />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function Enrollment() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedMk, setSelectedMk] = useState<AdminMatakuliah | null>(null)
  const [filterIzinTamu, setFilterIzinTamu] = useState<'all' | 'yes' | 'no'>('all')

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setDebouncedSearch(val), 400)
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey : ['admin-matakuliah', debouncedSearch, 1, 100],
    queryFn  : () => fetchMatakuliah({ search: debouncedSearch || undefined, page: 1, limit: 100 }),
    staleTime: 30_000,
  })

  const filteredMk = (data?.items ?? []).filter(mk => {
    if (filterIzinTamu === 'yes') return mk.izin_tamu
    if (filterIzinTamu === 'no')  return !mk.izin_tamu
    return true
  })

  const totalEnrolled = filteredMk.reduce((s, mk) => s + mk.total_mahasiswa, 0)

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enrollment</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola pendaftaran mahasiswa per kelas — klik kelas pada card untuk mengelola enrollment.
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60">
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Matakuliah', value: data?.total ?? 0, icon: <BookOpen className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-500/10' },
          { label: 'Total Mahasiswa Enrolled', value: totalEnrolled, icon: <Users className="w-4 h-4 text-green-500" />, bg: 'bg-green-500/10' },
          { label: 'Izin Tamu Aktif', value: (data?.items ?? []).filter(m => m.izin_tamu).length, icon: <ShieldCheck className="w-4 h-4 text-violet-500" />, bg: 'bg-violet-500/10' },
          { label: 'Izin Tamu Nonaktif', value: (data?.items ?? []).filter(m => !m.izin_tamu).length, icon: <ShieldAlert className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-500/10' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', stat.bg)}>{stat.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Cari kode atau nama matakuliah..."
            className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/30">
          {[{ id: 'all', label: 'Semua' }, { id: 'yes', label: 'Izin Tamu' }, { id: 'no', label: 'Tidak' }].map(f => (
            <button key={f.id} onClick={() => setFilterIzinTamu(f.id as typeof filterIzinTamu)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                filterIzinTamu === f.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground ml-auto">{filteredMk.length} matakuliah</p>
      </div>

      {/* ── Card Grid ──────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              <div className="h-8 rounded bg-muted animate-pulse mt-2" />
            </div>
          ))}
        </div>
      ) : filteredMk.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <BookOpen className="w-10 h-10 opacity-30" />
          <p className="text-sm">{debouncedSearch ? `Tidak ada matakuliah "${debouncedSearch}"` : 'Belum ada data matakuliah'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMk.map(mk => (
            <MatakuliahCard
              key={mk.id}
              mk={mk}
              onKelolaLegacy={() => setSelectedMk(mk)}
            />
          ))}
        </div>
      )}

      {/* Sheet Legacy Enrollment */}
      {selectedMk && (
        <SheetEnrollmentLegacy mk={selectedMk} onClose={() => setSelectedMk(null)} />
      )}
    </div>
  )
}