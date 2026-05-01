// src/api/enrollment.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk Fase 7 — Enrollment Management
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface MahasiswaEnrolled {
  mahasiswa_id : string
  nim          : string
  nama_lengkap : string
  email        : string
  program_studi: string
  is_active    : boolean
  is_tamu      : boolean
  kelas_asal   : string | null
  enrolled_at  : string | null
}

export interface MatakuliahEnrollmentDetail {
  matakuliah_id  : string
  kode           : string
  nama           : string
  hari           : string | null
  jam_mulai      : string | null
  jam_selesai    : string | null
  izin_tamu      : boolean
  total_asli     : number
  total_tamu     : number
  mahasiswa_asli : MahasiswaEnrolled[]
  mahasiswa_tamu : MahasiswaEnrolled[]
}

export interface BulkEnrollResult {
  success : boolean
  message : string
  berhasil: number
  gagal   : Array<{ id: string; alasan: string }>
}

// ── API Functions ──────────────────────────────────────────────

export async function getMahasiswaMatakuliah(
  mkId: string
): Promise<MatakuliahEnrollmentDetail> {
  const res = await api.get<MatakuliahEnrollmentDetail>(
    `/admin/matakuliah/${mkId}/mahasiswa`
  )
  return res.data
}

export async function enrollMahasiswa(
  mkId        : string,
  mahasiswaId : string
): Promise<{ message: string }> {
  const res = await api.post(`/admin/matakuliah/${mkId}/enroll`, {
    mahasiswa_id: mahasiswaId,
  })
  return res.data
}

export async function enrollBulk(
  mkId        : string,
  mahasiswaIds: string[]
): Promise<BulkEnrollResult> {
  const res = await api.post<BulkEnrollResult>(
    `/admin/matakuliah/${mkId}/enroll-bulk`,
    { mahasiswa_ids: mahasiswaIds }
  )
  return res.data
}

export async function unenrollMahasiswa(
  mkId        : string,
  mahasiswaId : string
): Promise<{ message: string }> {
  const res = await api.delete(
    `/admin/matakuliah/${mkId}/unenroll/${mahasiswaId}`
  )
  return res.data
}

export async function hapusTamu(
  mkId        : string,
  mahasiswaId : string
): Promise<{ message: string }> {
  const res = await api.delete(
    `/admin/matakuliah/${mkId}/tamu/${mahasiswaId}`
  )
  return res.data
}