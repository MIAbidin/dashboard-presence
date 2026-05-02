import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Activity, Play, Square, RefreshCw, Clock,
  CheckCircle2, XCircle, AlertTriangle, Info,
  Zap, Timer,
} from 'lucide-react'
import {
  fetchSchedulerStatus, startScheduler, stopScheduler,
} from '@/api/scheduler.api'
import type { SchedulerJob } from '@/api/scheduler.api'
import { cn } from '@/lib/utils'

// ── Helper ────────────────────────────────────────────────────

function fmtNextRun(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.round((d.getTime() - now.getTime()) / 1000)

  if (diff < 0)   return 'Sedang berjalan...'
  if (diff < 60)  return `${diff} detik lagi`
  if (diff < 3600) return `${Math.round(diff / 60)} menit lagi`
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtTrigger(trigger: string) {
  // "interval[0:01:00]" → "Setiap 1 menit"
  const match = trigger.match(/interval\[(\d+):(\d+):(\d+)\]/)
  if (!match) return trigger
  const [, h, m, s] = match.map(Number)
  if (h > 0)   return `Setiap ${h} jam`
  if (m > 0)   return `Setiap ${m} menit`
  if (s > 0)   return `Setiap ${s} detik`
  return trigger
}

// ── Aksi label maps ───────────────────────────────────────────

const JOB_ICONS: Record<string, string> = {
  tutup_sesi_expired       : '🔒',
  notif_pengingat_buka_sesi: '🔔',
}

const JOB_DESC: Record<string, string> = {
  tutup_sesi_expired       : 'Menutup sesi yang sudah melewati jam_selesai dan mengabsenkan mahasiswa yang belum hadir.',
  notif_pengingat_buka_sesi: 'Mengirim push notification FCM ke dosen 15 menit sebelum jam_mulai matakuliah.',
}

// ── Job Card ──────────────────────────────────────────────────

function JobCard({ job, isRunning }: { job: SchedulerJob; isRunning: boolean }) {
  const nextRunSec = job.next_run_time
    ? Math.round((new Date(job.next_run_time).getTime() - Date.now()) / 1000)
    : null
  const isUrgent = nextRunSec !== null && nextRunSec < 30

  return (
    <div className={cn(
      'rounded-xl border p-5 space-y-4 transition-colors',
      isRunning
        ? isUrgent
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-green-500/20 bg-green-500/5'
        : 'border-border bg-muted/20'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
            isRunning ? 'bg-green-500/10' : 'bg-muted'
          )}>
            {JOB_ICONS[job.id] ?? '⚙️'}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{job.name}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{job.id}</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={cn(
          'text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0',
          isRunning
            ? isUrgent
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-green-500/20 text-green-500'
            : 'bg-muted text-muted-foreground'
        )}>
          {isRunning ? (isUrgent ? '⚡ SEGERA' : '● AKTIF') : '○ IDLE'}
        </span>
      </div>

      {/* Deskripsi */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {JOB_DESC[job.id] ?? 'Job berjalan secara periodik.'}
      </p>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background border border-border px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Interval</p>
          <p className="text-xs font-semibold text-foreground">{fmtTrigger(job.trigger)}</p>
        </div>
        <div className={cn(
          'rounded-lg border px-3 py-2 transition-colors',
          isUrgent
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-background border-border'
        )}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Eksekusi Berikutnya</p>
          <p className={cn('text-xs font-semibold', isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
            {fmtNextRun(job.next_run_time)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function Scheduler() {
  const qc = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey       : ['scheduler-status'],
    queryFn        : fetchSchedulerStatus,
    staleTime      : 0,
    refetchInterval: 10_000,   // polling 10 detik
  })

  const startMutation = useMutation({
    mutationFn: startScheduler,
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['scheduler-status'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal start scheduler'
      toast.error(msg)
    },
  })

  const stopMutation = useMutation({
    mutationFn: stopScheduler,
    onSuccess : (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['scheduler-status'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal stop scheduler'
      toast.error(msg)
    },
  })

  const isRunning = data?.running ?? false
  const jobs      = data?.jobs ?? []

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitor Scheduler</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Status APScheduler — auto-refresh setiap 10 detik.
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

      {/* ── Status Card ────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl border p-6 transition-all',
        isLoading
          ? 'border-border bg-muted/20'
          : isRunning
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-red-500/30 bg-red-500/5'
      )}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Animated status dot */}
            <div className="relative">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center',
                isRunning ? 'bg-green-500/20' : 'bg-red-500/20'
              )}>
                {isRunning ? (
                  <Activity className="w-7 h-7 text-green-500" />
                ) : (
                  <Square className="w-7 h-7 text-red-500" />
                )}
              </div>
              {isRunning && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-2xl font-bold',
                  isRunning ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {isLoading ? '...' : isRunning ? 'RUNNING' : 'STOPPED'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isRunning
                  ? `${data?.total_jobs ?? 0} job aktif — sistem berjalan normal`
                  : 'Scheduler berhenti — sesi tidak akan ditutup otomatis'}
              </p>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending || isLoading}
                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {startMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Start Scheduler
              </button>
            ) : (
              <button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending || isLoading}
                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {stopMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Stop Scheduler
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Warning banner kalau stopped ───────────────── */}
      {!isLoading && !isRunning && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Scheduler tidak berjalan
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
              Sesi presensi tidak akan ditutup otomatis. Dosen harus menutup sesi secara manual.
              Push notification pengingat juga tidak akan terkirim. Klik "Start Scheduler" untuk mengaktifkan kembali.
            </p>
          </div>
        </div>
      )}

      {/* ── Info banner ─────────────────────────────────── */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          APScheduler berjalan sebagai background thread di dalam proses FastAPI.
          Saat server di-restart, scheduler otomatis distart ulang melalui lifespan event.
          Tombol Stop hanya untuk keperluan maintenance sementara — tidak persisten setelah restart.
        </p>
      </div>

      {/* ── Jobs grid ───────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Job Aktif ({data?.total_jobs ?? 0})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-12 rounded-lg bg-muted animate-pulse" />
                  <div className="h-12 rounded-lg bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-12 text-center">
            <Timer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {isRunning ? 'Tidak ada job terdaftar' : 'Scheduler tidak berjalan — tidak ada job yang aktif'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} isRunning={isRunning} />
            ))}
          </div>
        )}
      </div>

      {/* ── Referensi job yang seharusnya ada ──────────── */}
      {isRunning && jobs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Ringkasan Job
          </h3>
          <div className="space-y-2">
            {[
              { id: 'tutup_sesi_expired',        label: 'Tutup Sesi Expired',          interval: '1 menit', color: 'text-green-500 bg-green-500/10' },
              { id: 'notif_pengingat_buka_sesi', label: 'Notif Pengingat Buka Sesi',   interval: '1 menit', color: 'text-blue-500 bg-blue-500/10' },
            ].map((ref) => {
              const found = jobs.find(j => j.id === ref.id)
              return (
                <div key={ref.id} className="flex items-center gap-3 text-sm">
                  {found
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <XCircle     className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <span className="flex-1 text-foreground">{ref.label}</span>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ref.color)}>
                    {ref.interval}
                  </span>
                  {!found && (
                    <span className="text-[10px] text-red-500 font-medium">TIDAK TERDAFTAR</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}