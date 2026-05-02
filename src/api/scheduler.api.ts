// src/api/scheduler.api.ts
import api from '@/api/axios'

export interface SchedulerJob {
  id           : string
  name         : string
  next_run_time: string | null
  trigger      : string
}

export interface SchedulerStatus {
  running   : boolean
  status    : 'running' | 'stopped' | 'error' | 'unknown'
  jobs      : SchedulerJob[]
  total_jobs: number
  error    ?: string
}

export interface AuditLogItem {
  id         : string
  admin_id   : string
  admin_nama : string
  admin_nidn : string
  aksi       : string
  entitas    : string | null
  entitas_id : string | null
  detail     : string | null
  ip_address : string | null
  created_at : string | null
}

export interface AuditLogResponse {
  items      : AuditLogItem[]
  total      : number
  page       : number
  limit      : number
  total_pages: number
}

export interface AuditLogParams {
  page    ?: number
  limit   ?: number
  admin_id?: string
  entitas ?: string
  aksi    ?: string
}

// ── Scheduler ─────────────────────────────────────────────────

export async function fetchSchedulerStatus(): Promise<SchedulerStatus> {
  const res = await api.get<SchedulerStatus>('/admin/scheduler/status')
  return res.data
}

export async function startScheduler(): Promise<{ message: string; status: string }> {
  const res = await api.post('/admin/scheduler/start')
  return res.data
}

export async function stopScheduler(): Promise<{ message: string; status: string }> {
  const res = await api.post('/admin/scheduler/stop')
  return res.data
}

// ── Audit Log ─────────────────────────────────────────────────

export async function fetchAuditLogs(params: AuditLogParams = {}): Promise<AuditLogResponse> {
  const res = await api.get<AuditLogResponse>('/admin/audit-log', { params })
  return res.data
}

// ── Ganti Password ────────────────────────────────────────────

export async function gantiPassword(payload: {
  password_lama: string
  password_baru: string
  konfirmasi   : string
}): Promise<{ message: string }> {
  const res = await api.post('/admin/ganti-password', payload)
  return res.data
}