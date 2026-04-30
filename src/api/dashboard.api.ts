// src/api/dashboard.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk halaman Dashboard admin.
// Semua type definitions disertakan di sini agar Dashboard.tsx
// tidak perlu import dari tempat lain.
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface GrafikHariItem {
  tanggal    : string   // "24 Apr"
  tanggal_iso: string   // "2026-04-24"
  hadir      : number
  absen      : number
}

export interface DistribusiStatusItem {
  status: string        // "hadir" | "terlambat" | "absen" | "izin" | "sakit"
  jumlah: number
  persen: number
  warna : string        // hex color
}

export interface TopMkItem {
  matakuliah_id : string
  kode          : string
  nama          : string
  persentase    : number
  total_presensi: number
}

export interface SchedulerJob {
  id           : string
  name         : string
  next_run_time: string | null
}

export interface SchedulerStatus {
  running: boolean
  status : 'running' | 'stopped' | 'unknown'
  jobs   : SchedulerJob[]
}

export interface DashboardStats {
  total_mahasiswa          : number
  total_dosen              : number
  total_matakuliah         : number
  total_presensi_hari_ini  : number
  total_sesi_aktif         : number
  akurasi_rata_rata        : number
  grafik_kehadiran_7_hari  : GrafikHariItem[]
  distribusi_status        : DistribusiStatusItem[]
  top_mk_kehadiran_terendah: TopMkItem[]
  scheduler_status         : SchedulerStatus
}

// ── API Functions ──────────────────────────────────────────────

/**
 * Ambil semua data statistik untuk beranda admin.
 * Di-cache oleh React Query selama 30 detik.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>('/admin/dashboard')
  return res.data
}

/**
 * Ambil hanya jumlah sesi aktif — dipakai untuk polling setiap 10 detik.
 * Endpoint ringan karena hanya ambil satu field.
 */
export async function fetchSesiAktifCount(): Promise<number> {
  const res = await api.get<DashboardStats>('/admin/dashboard')
  return res.data.total_sesi_aktif
}
