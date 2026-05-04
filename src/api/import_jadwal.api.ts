// src/api/import_jadwal.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk Fase C — Import Jadwal dari PDF/Excel Kampus
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export type JadwalRowStatus = 'baru' | 'diupdate' | 'warning' | 'error'

export interface ParsedJadwalRow {
  status        : JadwalRowStatus
  kode_mk       : string
  nama_mk       : string
  kode_kelas    : string
  hari          : string | null
  slot          : string | null   // "1-3", "7-8"
  jam           : string | null   // "07:00 – 09:30"
  kode_ruangan  : string
  dosen         : string
  dosen_matched : string | null   // nama dosen yang ditemukan di sistem (null = tidak match)
  kode_akses    : string | null
  pesan         : string
}

export interface PreviewCounts {
  baru    : number
  diupdate: number
  warning : number
  error   : number
}

export interface PreviewJadwalResponse {
  total  : number
  preview: ParsedJadwalRow[]
  counts : PreviewCounts
  pesan  : string
}

export interface ImportJadwalError {
  baris   : number
  kode_mk : string
  kelas   : string
  pesan   : string
}

export interface ImportJadwalResult {
  total   : number
  berhasil: number
  diupdate: number
  warning : number
  error   : number
  errors  : ImportJadwalError[]
  preview : ParsedJadwalRow[]   // contoh 10 kelas yang berhasil
  pesan   : string
}

// ── API Functions ──────────────────────────────────────────────

/**
 * Preview hasil parsing file jadwal (PDF atau Excel) TANPA insert ke DB.
 * Gunakan ini dulu sebelum import sesungguhnya.
 */
export async function previewJadwal(file: File): Promise<PreviewJadwalResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<PreviewJadwalResponse>(
    '/admin/import/jadwal/preview',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return res.data
}

/**
 * Import jadwal ke database (INSERT/UPDATE ke kelas_matakuliah).
 * Jalankan setelah preview sudah dicek dan hasilnya sesuai.
 */
export async function importJadwal(file: File): Promise<ImportJadwalResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<ImportJadwalResult>(
    '/admin/import/jadwal',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return res.data
}

/**
 * Download template Excel jadwal yang sudah diformat.
 * Admin isi template ini lalu upload kembali.
 */
export function downloadTemplateJadwal(): void {
  window.open('/api/admin/import/template/jadwal', '_blank')
}