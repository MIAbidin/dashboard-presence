// src/api/laporan.api.ts
import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface LaporanItem {
  matakuliah_id   : string
  kode            : string
  nama            : string
  sks             : number
  hari            : string | null
  jam_mulai       : string | null
  jam_selesai     : string | null
  dosen_id        : string
  nama_dosen      : string
  nidn            : string
  total_pertemuan : number
  total           : number
  hadir           : number
  terlambat       : number
  absen           : number
  izin            : number
  sakit           : number
  hadir_efektif   : number
  persentase      : number
  sesi_terakhir   : string | null
}

export interface LaporanGlobalResponse {
  items      : LaporanItem[]
  total      : number
  page       : number
  limit      : number
  total_pages: number
  ringkasan  : {
    total_sesi          : number
    total_presensi      : number
    rata_rata_kehadiran : number
  }
}

export interface SesiDetail {
  sesi_id      : string
  pertemuan_ke : number
  mode         : string
  waktu_buka   : string | null
  waktu_tutup  : string | null
  status       : string
  total        : number
  hadir        : number
  terlambat    : number
  absen        : number
  izin         : number
  sakit        : number
  hadir_efektif: number
  persentase   : number
}

export interface PresensiDetail {
  presensi_id   : string
  mahasiswa_id  : string
  nim           : string
  nama_lengkap  : string
  program_studi : string
  status        : string
  waktu_presensi: string | null
  akurasi_wajah : number | null
  mode_kelas    : string
  catatan       : string | null
}

export interface LaporanDetailResponse {
  tipe            : 'sesi' | 'matakuliah'
  // Mode sesi
  sesi_id        ?: string
  matakuliah_id  ?: string
  nama_matakuliah?: string
  kode_mk        ?: string
  pertemuan_ke   ?: number
  mode           ?: string
  waktu_buka     ?: string | null
  waktu_tutup    ?: string | null
  statistik      ?: ReturnType<typeof Object.create>
  detail         ?: PresensiDetail[]
  // Mode matakuliah
  nama           ?: string
  kode           ?: string
  sesi_list      ?: SesiDetail[]
  statistik_total?: ReturnType<typeof Object.create>
}

export interface RiwayatPertemuan {
  sesi_id       : string
  pertemuan_ke  : number | null
  status        : string
  waktu_presensi: string | null
  mode_kelas    : string
  akurasi_wajah : number | null
  catatan       : string | null
}

export interface PerMatakuliah {
  matakuliah_id: string
  kode         : string
  nama         : string
  hari         : string | null
  jam_mulai    : string | null
  total        : number
  hadir        : number
  terlambat    : number
  absen        : number
  izin         : number
  sakit        : number
  hadir_efektif: number
  persentase   : number
  riwayat      : RiwayatPertemuan[]
}

export interface LaporanMahasiswaResponse {
  mahasiswa_id    : string
  nim             : string
  nama_lengkap    : string
  program_studi   : string
  is_face_registered: boolean
  total_presensi  : number
  statistik       : {
    total: number; hadir: number; terlambat: number
    absen: number; izin: number; sakit: number
    hadir_efektif: number; persentase: number
  }
  per_matakuliah  : PerMatakuliah[]
}

export interface LaporanFilterParams {
  matakuliah_id  ?: string
  dosen_id       ?: string
  program_studi  ?: string
  periode_mulai  ?: string   // YYYY-MM-DD
  periode_selesai?: string
  mode           ?: string   // offline | online
  page           ?: number
  limit          ?: number
}

// ── API Functions ──────────────────────────────────────────────

export async function fetchLaporanGlobal(
  params: LaporanFilterParams = {}
): Promise<LaporanGlobalResponse> {
  const res = await api.get<LaporanGlobalResponse>('/admin/laporan', { params })
  return res.data
}

export async function fetchLaporanDetail(params: {
  matakuliah_id?: string
  sesi_id      ?: string
}): Promise<LaporanDetailResponse> {
  const res = await api.get<LaporanDetailResponse>('/admin/laporan/detail', { params })
  return res.data
}

export async function fetchLaporanMahasiswa(
  userId: string
): Promise<LaporanMahasiswaResponse> {
  const res = await api.get<LaporanMahasiswaResponse>(`/admin/laporan/mahasiswa/${userId}`)
  return res.data
}

export function buildExportUrl(
  type  : 'excel' | 'pdf',
  params: Omit<LaporanFilterParams, 'page' | 'limit'>
): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const endpoint = type === 'excel'
    ? '/admin/laporan/export/excel'
    : '/admin/laporan/export/pdf'
  const token = localStorage.getItem('access_token') ?? ''
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v) })
  // Untuk download dengan auth, kita fetch manual
  return `${base}${endpoint}?${qs.toString()}&_token=${token}`
}

export async function downloadLaporan(
  type  : 'excel' | 'pdf',
  params: Omit<LaporanFilterParams, 'page' | 'limit'>,
  filename: string
): Promise<void> {
  const endpoint = type === 'excel'
    ? '/admin/laporan/export/excel'
    : '/admin/laporan/export/pdf'
  const res = await api.get(endpoint, {
    params,
    responseType: 'blob',
  })
  const url  = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href  = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}