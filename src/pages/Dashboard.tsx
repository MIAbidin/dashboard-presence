import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, GraduationCap, BookOpen, ClipboardCheck,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Clock, Activity, RefreshCw,
} from 'lucide-react'
import { fetchDashboardStats } from '@/api/dashboard.api'
import type { DashboardStats, DistribusiStatusItem, TopMkItem } from '@/api/dashboard.api'
import { cn } from '@/lib/utils'

// ── Sub-komponen ──────────────────────────────────────────────

interface StatCardProps {
  label   : string
  value   : number | string
  icon    : React.ReactNode
  color   : string   // bg color class
  sublabel?: string
  loading ?: boolean
}

function StatCard({ label, value, icon, color, sublabel, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex gap-4 items-start">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {loading ? (
          <div className="h-7 w-16 rounded bg-muted animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
        )}
        {sublabel && (
          <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

// ── Scheduler Badge ───────────────────────────────────────────

function SchedulerBadge({ status }: { status: DashboardStats['scheduler_status'] }) {
  const isRunning = status.running

  return (
    <div className={cn(
      'rounded-xl border p-4',
      isRunning
        ? 'border-green-500/20 bg-green-500/5'
        : 'border-red-500/20 bg-red-500/5'
    )}>
      <div className="flex items-center gap-2 mb-3">
        {isRunning ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <span className="text-sm font-semibold text-foreground">APScheduler</span>
        <span className={cn(
          'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full',
          isRunning
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        )}>
          {isRunning ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>

      {status.jobs.length === 0 && (
        <p className="text-xs text-muted-foreground">Tidak ada job aktif.</p>
      )}

      <div className="space-y-2">
        {status.jobs.map((job) => (
          <div key={job.id} className="flex items-start gap-2">
            <Activity className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{job.name}</p>
              {job.next_run_time && (
                <p className="text-[10px] text-muted-foreground">
                  Next: {new Date(job.next_run_time).toLocaleTimeString('id-ID')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tabel MK Kehadiran Terendah ───────────────────────────────

function TabelMkTerendah({ data, loading }: { data: TopMkItem[], loading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">
          5 Matakuliah Kehadiran Terendah
        </h3>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex gap-3 items-center">
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
              <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
              <div className="h-4 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Belum ada data sesi selesai.
          </div>
        ) : (
          data.map((mk, i) => {
            const color =
              mk.persentase < 60 ? 'text-red-500 bg-red-500/10' :
              mk.persentase < 75 ? 'text-amber-500 bg-amber-500/10' :
              'text-green-500 bg-green-500/10'
            return (
              <div key={mk.matakuliah_id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{mk.nama}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {mk.kode} · {mk.total_presensi} presensi
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-current transition-all"
                      style={{
                        width: `${mk.persentase}%`,
                        color: mk.persentase < 60 ? '#ef4444' :
                               mk.persentase < 75 ? '#f59e0b' : '#22c55e'
                      }}
                    />
                  </div>
                  <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded', color)}>
                    {mk.persentase}%
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────

export default function Dashboard() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey   : ['admin-dashboard'],
    queryFn    : fetchDashboardStats,
    staleTime  : 30_000,   // cache 30 detik
    refetchInterval: 60_000, // refresh otomatis tiap 1 menit
  })

  // Polling sesi aktif setiap 10 detik — query terpisah agar
  // tidak re-render seluruh halaman
  const { data: sesiAktifData } = useQuery({
    queryKey        : ['admin-sesi-aktif'],
    queryFn         : fetchDashboardStats,
    staleTime       : 0,
    refetchInterval : 10_000,
    select          : (d) => d.total_sesi_aktif,
  })

  const stats = data
  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID')
    : '-'

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Statistik global sistem presensi — diperbarui otomatis setiap menit.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          {isFetching ? 'Memperbarui...' : `Terakhir: ${lastUpdate}`}
        </button>
      </div>

      {/* ── 4 StatCards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Mahasiswa"
          value={stats?.total_mahasiswa ?? 0}
          icon={<Users className="w-5 h-5 text-white" />}
          color="bg-blue-600"
          sublabel="Akun aktif"
          loading={isLoading}
        />
        <StatCard
          label="Total Dosen"
          value={stats?.total_dosen ?? 0}
          icon={<GraduationCap className="w-5 h-5 text-white" />}
          color="bg-violet-600"
          sublabel="Akun aktif"
          loading={isLoading}
        />
        <StatCard
          label="Total Matakuliah"
          value={stats?.total_matakuliah ?? 0}
          icon={<BookOpen className="w-5 h-5 text-white" />}
          color="bg-amber-500"
          sublabel="Semua program studi"
          loading={isLoading}
        />
        <StatCard
          label="Presensi Hari Ini"
          value={stats?.total_presensi_hari_ini ?? 0}
          icon={<ClipboardCheck className="w-5 h-5 text-white" />}
          color="bg-green-600"
          sublabel={`Akurasi rata-rata: ${stats?.akurasi_rata_rata ?? 0}%`}
          loading={isLoading}
        />
      </div>

      {/* ── Row 2: AreaChart + Scheduler + Sesi Aktif ──── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* AreaChart — 2/3 lebar */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Tren Kehadiran 7 Hari Terakhir
            </h3>
          </div>
          {isLoading ? (
            <div className="h-48 rounded bg-muted animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={stats?.grafik_kehadiran_7_hari ?? []}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAbsen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone" dataKey="hadir" name="Hadir"
                  stroke="#22c55e" fill="url(#colorHadir)" strokeWidth={2}
                />
                <Area
                  type="monotone" dataKey="absen" name="Absen"
                  stroke="#ef4444" fill="url(#colorAbsen)" strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Kanan: Sesi Aktif + Scheduler */}
        <div className="flex flex-col gap-4">
          {/* Kartu Sesi Aktif — polling 10 detik */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Sesi Aktif</h3>
              <span className="ml-auto text-[10px] text-muted-foreground">
                polling 10s
              </span>
            </div>
            <p className="text-4xl font-bold text-foreground">
              {sesiAktifData ?? stats?.total_sesi_aktif ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sesi presensi sedang terbuka saat ini
            </p>
          </div>

          {/* Badge Scheduler */}
          {isLoading ? (
            <div className="h-32 rounded-xl bg-muted animate-pulse" />
          ) : stats?.scheduler_status ? (
            <SchedulerBadge status={stats.scheduler_status} />
          ) : null}
        </div>
      </div>

      {/* ── Row 3: PieChart + Tabel MK Terendah ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* PieChart distribusi */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Distribusi Status Kehadiran
          </h3>
          {isLoading ? (
            <div className="h-64 rounded bg-muted animate-pulse" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie
                    data={stats?.distribusi_status ?? []}
                    dataKey="jumlah"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    strokeWidth={0}
                  >
                    {(stats?.distribusi_status ?? []).map((entry: DistribusiStatusItem) => (
                      <Cell key={entry.status} fill={entry.warna} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) =>
                      [`${value} presensi`, name]
                    }
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend manual */}
              <div className="flex-1 space-y-2">
                {(stats?.distribusi_status ?? []).map((item: DistribusiStatusItem) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: item.warna }}
                    />
                    <span className="text-xs text-foreground capitalize flex-1">
                      {item.status}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {item.persen}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabel MK Terendah */}
        <TabelMkTerendah
          data={stats?.top_mk_kehadiran_terendah ?? []}
          loading={isLoading}
        />
      </div>
    </div>
  )
}
