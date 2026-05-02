// src/api/ruangan.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk Fase A — Manajemen Ruangan Kuliah
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface Ruangan {
  id            : string
  kode          : string
  nama          : string
  tipe          : string | null   // kuliah | lab | seminar | lainnya
  kapasitas     : number | null
  gedung        : string | null
  lantai        : number | null
  koordinat_lat : number | null
  koordinat_lng : number | null
  keterangan    : string | null
  is_active     : boolean
  created_at    : string
  updated_at    : string
}

export interface PaginatedRuangan {
  items      : Ruangan[]
  total      : number
  page       : number
  limit      : number
  total_pages: number
}

export interface RuanganStats {
  total  : number
  aktif  : number
  lab    : number
  kuliah : number
  seminar: number
}

export interface CreateRuanganPayload {
  kode          : string
  nama          : string
  tipe         ?: string | null
  kapasitas    ?: number | null
  gedung       ?: string | null
  lantai       ?: number | null
  koordinat_lat?: number | null
  koordinat_lng?: number | null
  keterangan   ?: string | null
}

export type UpdateRuanganPayload = Partial<CreateRuanganPayload> & {
  is_active?: boolean
}

export interface ListRuanganParams {
  search?: string
  tipe  ?: string
  page  ?: number
  limit ?: number
}

// ── API Functions ──────────────────────────────────────────────

export async function fetchRuangan(
  params: ListRuanganParams = {}
): Promise<PaginatedRuangan> {
  const res = await api.get<PaginatedRuangan>('/admin/ruangan', { params })
  return res.data
}

export async function fetchRuanganStats(): Promise<RuanganStats> {
  const res = await api.get<RuanganStats>('/admin/ruangan/stats')
  return res.data
}

export async function fetchRuanganAktif(tipe?: string): Promise<Ruangan[]> {
  const res = await api.get<Ruangan[]>('/ruangan/aktif', {
    params: tipe ? { tipe } : {},
  })
  return res.data
}

export async function createRuangan(
  payload: CreateRuanganPayload
): Promise<{ message: string; ruangan: Ruangan }> {
  const res = await api.post('/admin/ruangan', payload)
  return res.data
}

export async function updateRuangan(
  id     : string,
  payload: UpdateRuanganPayload
): Promise<{ message: string; ruangan: Ruangan }> {
  const res = await api.put(`/admin/ruangan/${id}`, payload)
  return res.data
}

export async function deleteRuangan(id: string): Promise<{ message: string }> {
  const res = await api.delete(`/admin/ruangan/${id}`)
  return res.data
}

export async function toggleRuangan(
  id      : string,
  isActive: boolean
): Promise<{ message: string; ruangan: Ruangan }> {
  const res = await api.patch(`/admin/ruangan/${id}/toggle`, { is_active: isActive })
  return res.data
}