// src/api/users.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk manajemen user (mahasiswa & dosen)
// Fase 5: tambah total_mk_diampu untuk dosen
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface AdminUser {
  id                : string
  nim_nidn          : string
  nama_lengkap      : string
  email             : string
  role              : 'mahasiswa' | 'dosen' | 'admin'
  program_studi     : string
  is_face_registered: boolean
  is_active         : boolean
  total_foto_wajah  : number
  total_mk_diampu   : number   // ← BARU Fase 5 (jumlah MK unik yang pernah dibuat sesinya)
  created_at        : string
}

export interface PaginatedUsers {
  items      : AdminUser[]
  total      : number
  page       : number
  limit      : number
  total_pages: number
}

export interface CreateUserPayload {
  nim_nidn      : string
  nama_lengkap  : string
  email         : string
  password      : string
  role          : 'mahasiswa' | 'dosen'
  program_studi : string
}

export interface UpdateUserPayload {
  nama_lengkap ?: string
  email        ?: string
  program_studi?: string
  is_active    ?: boolean
}

export interface FaceEmbeddingInfo {
  foto_index   : number
  embedding_id : string
  created_at   : string | null
}

export interface KonsistensiInternal {
  rata_rata_jarak: number
  jarak_maksimum : number
  status         : string
  warna          : string
  keterangan     : string
}

export interface FaceDiagnoseResult {
  user_id              : string
  nama                 : string
  nim                  : string
  is_face_registered   : boolean
  total_embeddings     : number
  threshold_aktif      : number
  range_jarak_valid    : string
  konsistensi_internal : KonsistensiInternal
  embeddings           : FaceEmbeddingInfo[]
  rekomendasi          : string[]
  status              ?: string   // jika belum ada data
}

// ── Query Params ──────────────────────────────────────────────

export interface ListUsersParams {
  role  ?: 'mahasiswa' | 'dosen' | 'admin'
  search?: string
  page  ?: number
  limit ?: number
}

// ── API Functions ──────────────────────────────────────────────

export async function fetchUsers(params: ListUsersParams = {}): Promise<PaginatedUsers> {
  const res = await api.get<PaginatedUsers>('/admin/users', { params })
  return res.data
}

export async function createUser(payload: CreateUserPayload): Promise<{ message: string; user: AdminUser }> {
  const res = await api.post('/admin/users', payload)
  return res.data
}

export async function updateUser(
  userId : string,
  payload: UpdateUserPayload
): Promise<{ message: string; user: AdminUser }> {
  const res = await api.put(`/admin/users/${userId}`, payload)
  return res.data
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
  const res = await api.delete(`/admin/users/${userId}`)
  return res.data
}

export async function resetFace(userId: string): Promise<{ message: string }> {
  const res = await api.post(`/admin/users/${userId}/reset-face`)
  return res.data
}

export async function resetPassword(
  userId      : string,
  passwordBaru: string
): Promise<{ message: string }> {
  const res = await api.post(`/admin/users/${userId}/reset-password`, {
    password_baru: passwordBaru,
  })
  return res.data
}

export async function faceDiagnose(userId: string): Promise<FaceDiagnoseResult> {
  const res = await api.post<FaceDiagnoseResult>(`/admin/users/${userId}/face-diagnose`)
  return res.data
}