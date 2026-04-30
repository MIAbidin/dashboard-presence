// src/api/matakuliah.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk manajemen matakuliah (Fase 6)
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface AdminMatakuliah {
  id             : string
  kode           : string
  nama           : string
  sks            : number
  hari           : string | null
  jam_mulai      : string | null   // "HH:MM"
  jam_selesai    : string | null
  ruangan        : string | null
  koordinat_lat  : number | null
  koordinat_lng  : number | null
  izin_tamu      : boolean
  total_mahasiswa: number
  created_at     : string
}

export interface PaginatedMatakuliah {
  items      : AdminMatakuliah[]
  total      : number
  page       : number
  limit      : number
  total_pages: number
}

export interface CreateMatakuliahPayload {
  kode          : string
  nama          : string
  sks           : number
  hari         ?: string | null
  jam_mulai    ?: string | null
  jam_selesai  ?: string | null
  ruangan      ?: string | null
  koordinat_lat?: number | null
  koordinat_lng?: number | null
  izin_tamu    ?: boolean
}

export type UpdateMatakuliahPayload = Partial<CreateMatakuliahPayload>

export interface ListMatakuliahParams {
  search?: string
  page  ?: number
  limit ?: number
}

// ── API Functions ──────────────────────────────────────────────

export async function fetchMatakuliah(
  params: ListMatakuliahParams = {}
): Promise<PaginatedMatakuliah> {
  const res = await api.get<PaginatedMatakuliah>('/admin/matakuliah', { params })
  return res.data
}

export async function createMatakuliah(
  payload: CreateMatakuliahPayload
): Promise<{ message: string; matakuliah: AdminMatakuliah }> {
  const res = await api.post('/admin/matakuliah', payload)
  return res.data
}

export async function updateMatakuliah(
  mkId   : string,
  payload: UpdateMatakuliahPayload
): Promise<{ message: string; matakuliah: AdminMatakuliah }> {
  const res = await api.put(`/admin/matakuliah/${mkId}`, payload)
  return res.data
}

export async function deleteMatakuliah(
  mkId: string
): Promise<{ message: string }> {
  const res = await api.delete(`/admin/matakuliah/${mkId}`)
  return res.data
}

export async function toggleIzinTamu(
  mkId     : string,
  izinTamu : boolean
): Promise<{ message: string; matakuliah: AdminMatakuliah }> {
  const res = await api.patch(`/admin/matakuliah/${mkId}/izin-tamu`, {
    izin_tamu: izinTamu,
  })
  return res.data
}