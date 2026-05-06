// src/api/superadmin.api.ts
// Fase E — API calls untuk endpoint Super Admin

import api from '@/api/axios'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export interface AdminFakultas {
  id: string
  nim_nidn: string
  nama_lengkap: string
  email: string
  role: string
  program_studi: string
  is_active: boolean
  created_at: string
}

export interface ListAdminResponse {
  total: number
  page: number
  limit: number
  data: AdminFakultas[]
}

export interface BuatAdminPayload {
  nim_nidn: string
  nama_lengkap: string
  email: string
  password: string
  program_studi: string
}

export interface UpdateAdminPayload {
  nim_nidn?: string
  nama_lengkap?: string
  email?: string
  program_studi?: string
}

export interface KonfigurasiItem {
  id: string
  key: string
  value: string
  label: string | null
  deskripsi: string | null
  tipe: 'string' | 'float' | 'integer' | 'boolean'
  nilai_min: string | null
  nilai_max: string | null
  is_readonly: boolean
  updated_at: string | null
}

export interface BulkUpdateKonfigurasiResponse {
  berhasil: string[]
  gagal: { key: string; error: string }[]
  pesan: string
}

// ══════════════════════════════════════════════════════════════
// MANAJEMEN AKUN ADMIN FAKULTAS
// ══════════════════════════════════════════════════════════════

export async function fetchAdmins(params: {
  search?: string
  page?: number
  limit?: number
} = {}): Promise<ListAdminResponse> {
  const { data } = await api.get('/superadmin/admins', { params })
  return data
}

export async function fetchAdmin(adminId: string): Promise<AdminFakultas> {
  const { data } = await api.get(`/superadmin/admins/${adminId}`)
  return data
}

export async function createAdmin(payload: BuatAdminPayload): Promise<AdminFakultas> {
  const { data } = await api.post('/superadmin/admins', payload)
  return data
}

export async function updateAdmin(
  adminId: string,
  payload: UpdateAdminPayload
): Promise<AdminFakultas> {
  const { data } = await api.put(`/superadmin/admins/${adminId}`, payload)
  return data
}

export async function toggleAdmin(
  adminId: string,
  isActive: boolean
): Promise<AdminFakultas> {
  const { data } = await api.patch(`/superadmin/admins/${adminId}/toggle`, null, {
    params: { is_active: isActive },
  })
  return data
}

export async function resetPasswordAdmin(
  adminId: string,
  passwordBaru: string
): Promise<{ message: string }> {
  const { data } = await api.post(`/superadmin/admins/${adminId}/reset-password`, {
    password_baru: passwordBaru,
  })
  return data
}

// ══════════════════════════════════════════════════════════════
// KONFIGURASI SISTEM
// ══════════════════════════════════════════════════════════════

export async function fetchKonfigurasi(): Promise<KonfigurasiItem[]> {
  const { data } = await api.get('/superadmin/konfigurasi')
  return data
}

export async function fetchKonfigurasiByKey(key: string): Promise<KonfigurasiItem> {
  const { data } = await api.get(`/superadmin/konfigurasi/${key}`)
  return data
}

export async function updateKonfigurasi(
  key: string,
  value: string
): Promise<KonfigurasiItem> {
  const { data } = await api.patch(`/superadmin/konfigurasi/${key}`, { value })
  return data
}

export async function bulkUpdateKonfigurasi(
  konfigurasi: Record<string, string>
): Promise<BulkUpdateKonfigurasiResponse> {
  const { data } = await api.patch('/superadmin/konfigurasi', { konfigurasi })
  return data
}