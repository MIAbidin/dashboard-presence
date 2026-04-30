// ── User & Auth ───────────────────────────────────────────────

export type UserRole = 'mahasiswa' | 'dosen' | 'admin'

export interface User {
  id: string
  nim_nidn: string
  nama_lengkap: string
  email: string
  role: UserRole
  program_studi: string
  is_face_registered: boolean
  is_active: boolean
  fcm_token?: string | null
  created_at: string
}

export interface Mahasiswa extends User {
  role: 'mahasiswa'
}

export interface Dosen extends User {
  role: 'dosen'
}

// ── Matakuliah ───────────────────────────────────────────────

export interface Matakuliah {
  id: string
  kode: string
  nama: string
  sks: number
  hari?: string | null
  jam_mulai?: string | null    // "HH:MM"
  jam_selesai?: string | null  // "HH:MM"
  ruangan?: string | null
  koordinat_lat?: number | null
  koordinat_lng?: number | null
  created_at: string
}

// ── Presensi & Sesi ──────────────────────────────────────────

export type PresensiStatus = 'hadir' | 'terlambat' | 'absen' | 'izin' | 'sakit'
export type SesiMode = 'offline' | 'online'
export type SesiStatus = 'aktif' | 'selesai'

export interface SesiPresensi {
  id: string
  matakuliah_id: string
  dosen_id: string
  mode: SesiMode
  kode_sesi?: string | null
  kode_expire_at?: string | null
  pertemuan_ke: number
  waktu_buka: string
  waktu_tutup?: string | null
  batas_terlambat: string
  status: SesiStatus
}

export interface Presensi {
  id: string
  mahasiswa_id: string
  sesi_id: string
  status: PresensiStatus
  waktu_presensi?: string | null
  akurasi_wajah?: number | null
  mode_kelas: SesiMode
  latitude?: number | null
  longitude?: number | null
  catatan?: string | null
  diubah_oleh?: string | null
  created_at: string
}

// ── API Response Shapes ──────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface ApiError {
  detail: string
}

// ── Dashboard Stats ──────────────────────────────────────────

export interface DashboardStats {
  total_mahasiswa: number
  total_dosen: number
  total_matakuliah: number
  total_presensi_hari_ini: number
  total_sesi_aktif: number
  akurasi_rata_rata: number
  grafik_kehadiran_7_hari: Array<{
    tanggal: string
    jumlah: number
  }>
  distribusi_status: Array<{
    status: PresensiStatus
    jumlah: number
    persen: number
  }>
  top_mk_kehadiran_terendah: Array<{
    matakuliah_id: string
    nama: string
    kode: string
    persentase: number
  }>
}

// ── Form Types ───────────────────────────────────────────────

export interface MahasiswaFormData {
  nim_nidn: string
  nama_lengkap: string
  email: string
  password?: string
  program_studi: string
  is_active?: boolean
}

export interface DosenFormData {
  nim_nidn: string
  nama_lengkap: string
  email: string
  password?: string
  program_studi: string
  is_active?: boolean
}

export interface MatakuliahFormData {
  kode: string
  nama: string
  sks: number
  hari?: string
  jam_mulai?: string
  jam_selesai?: string
  ruangan?: string
  koordinat_lat?: number
  koordinat_lng?: number
}

// ── Import Result ─────────────────────────────────────────────

export interface ImportResult {
  total_baris: number
  berhasil: number
  gagal: number
  errors: Array<{
    baris: number
    kolom: string
    pesan: string
  }>
}