// src/api/kelas.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk Fase B — Kelas per Matakuliah (Multi-Kelas)
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface KelasMatakuliah {
  id            : string
  matakuliah_id : string
  kode_kelas    : string        // 'A', 'B', 'C', 'X'
  dosen_id      : string | null
  nama_dosen    : string | null
  nidn_dosen    : string | null
  ruangan_id    : string | null
  kode_ruangan  : string | null
  nama_ruangan  : string | null
  tipe_ruangan  : string | null
  hari          : string | null
  slot_mulai    : number | null
  slot_selesai  : number | null
  jam_mulai     : string | null  // "07:00" — dihitung dari slot
  jam_selesai   : string | null  // "09:30"
  jam_range     : string | null  // "07:00 – 09:30"
  kode_akses    : string | null  // URL Google Classroom / kode WA
  izin_tamu     : boolean
  is_active     : boolean
  total_enrolled: number
  created_at    : string | null
}

export interface KelasListResponse {
  matakuliah_id  : string
  kode_mk        : string
  nama_mk        : string
  total_kelas    : number
  legacy_enrolled: number  // enrollment lama tanpa kelas_id (backward compat)
  kelas          : KelasMatakuliah[]
}

export interface MahasiswaKelasItem {
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

export interface MahasiswaKelasResponse {
  kelas_id      : string
  kode_kelas    : string
  matakuliah_id : string
  kode_mk       : string
  nama_mk       : string
  izin_tamu     : boolean
  total_asli    : number
  total_tamu    : number
  mahasiswa_asli: MahasiswaKelasItem[]
  mahasiswa_tamu: MahasiswaKelasItem[]
}

export interface SlotOption {
  slot       : number
  jam_mulai  : string
  jam_selesai: string
  label      : string
}

export interface CreateKelasPayload {
  kode_kelas  : string
  dosen_id   ?: string | null
  ruangan_id ?: string | null
  hari       ?: string | null
  slot_mulai ?: number | null
  slot_selesai?: number | null
  kode_akses ?: string | null
  izin_tamu   : boolean
}

export type UpdateKelasPayload = Partial<CreateKelasPayload> & {
  is_active?: boolean
}

// ── API Functions ──────────────────────────────────────────────

/** List semua kelas dalam satu matakuliah */
export async function fetchKelas(mkId: string): Promise<KelasListResponse> {
  const res = await api.get<KelasListResponse>(`/admin/matakuliah/${mkId}/kelas`)
  return res.data
}

/** Tambah kelas baru ke matakuliah */
export async function createKelas(
  mkId   : string,
  payload: CreateKelasPayload
): Promise<{ message: string; kelas: KelasMatakuliah }> {
  const res = await api.post(`/admin/matakuliah/${mkId}/kelas`, payload)
  return res.data
}

/** Update data kelas (partial update) */
export async function updateKelas(
  mkId   : string,
  kelasId: string,
  payload: UpdateKelasPayload
): Promise<{ message: string; kelas: KelasMatakuliah }> {
  const res = await api.put(`/admin/matakuliah/${mkId}/kelas/${kelasId}`, payload)
  return res.data
}

/** Hapus kelas */
export async function deleteKelas(
  mkId   : string,
  kelasId: string
): Promise<{ message: string }> {
  const res = await api.delete(`/admin/matakuliah/${mkId}/kelas/${kelasId}`)
  return res.data
}

/** Toggle izin tamu per kelas */
export async function toggleIzinTamuKelas(
  kelasId : string,
  izinTamu: boolean
): Promise<{ message: string; kelas: KelasMatakuliah }> {
  const res = await api.patch(`/admin/kelas/${kelasId}/izin-tamu`, {
    izin_tamu: izinTamu,
  })
  return res.data
}

/** List mahasiswa terdaftar di kelas tertentu (asli + tamu) */
export async function fetchMahasiswaKelas(
  kelasId: string
): Promise<MahasiswaKelasResponse> {
  const res = await api.get<MahasiswaKelasResponse>(`/kelas/mahasiswa/${kelasId}`)
  return res.data
}

/** List slot options untuk dropdown (slot 1-12 → jam) */
export async function fetchSlotOptions(): Promise<SlotOption[]> {
  const res = await api.get<SlotOption[]>('/kelas/slot-options')
  return res.data
}