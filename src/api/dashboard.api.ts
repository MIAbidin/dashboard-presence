// src/api/dashboard.api.ts
// Update Fase F.1: tambah type JadwalHariIniItem + field jadwal_hari_ini di DashboardStats
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface GrafikHariItem {
  tanggal    : string
  tanggal_iso: string
  hadir      : number
  absen      : number
}

export interface DistribusiStatusItem {
  status: string
  jumlah: number
  persen: number
  warna : string
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

// ── Fase F.1: Jadwal Hari Ini ─────────────────────────────────

export interface JadwalHariIniItem {
  kelas_id          : string
  kode_kelas        : string
  matakuliah_id     : string | null
  kode_mk           : string
  nama_mk           : string
  dosen_id          : string | null
  nama_dosen        : string | null
  ruangan_id        : string | null
  kode_ruangan      : string | null
  nama_ruangan      : string | null
  tipe_ruangan      : 'kuliah' | 'lab' | 'seminar' | 'lainnya' | null
  slot_mulai        : number
  slot_selesai      : number
  jam_mulai         : string | null   // "07:00"
  jam_selesai       : string | null   // "09:30"
  jam_range         : string | null   // "07:00 – 09:30"
  is_aktif_sekarang : boolean
  ada_sesi_aktif    : boolean
  izin_tamu         : boolean
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
  jadwal_hari_ini          : JadwalHariIniItem[]   // ← Fase F.1
}

// ── API Functions ──────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>('/admin/dashboard')
  return res.data
}

export async function fetchSesiAktifCount(): Promise<number> {
  const res = await api.get<DashboardStats>('/admin/dashboard')
  return res.data.total_sesi_aktif
}