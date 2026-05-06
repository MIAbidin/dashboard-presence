// src/api/program_studi.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk manajemen Program Studi (Fase D)
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface ProgramStudi {
  id               : string
  kode             : string
  nama             : string
  fakultas         : string | null
  jenjang          : 'D3' | 'D4' | 'S1' | 'S2' | 'S3' | null
  is_active        : boolean
  jumlah_mahasiswa : number
  jumlah_dosen     : number
  created_at       : string
  updated_at       : string
}

export interface ProgramStudiStats {
  total : number
  aktif : number
  s1    : number
  d3    : number
  d4    : number
}

export interface PaginatedProgramStudi {
  items      : ProgramStudi[]
  total      : number
  page       : number
  limit      : number
  total_pages: number
}

export interface CreateProgramStudiPayload {
  kode    : string
  nama    : string
  fakultas?: string
  jenjang ?: string
}

export interface UpdateProgramStudiPayload {
  kode    ?: string
  nama    ?: string
  fakultas?: string
  jenjang ?: string
  is_active?: boolean
}

export interface ListProgramStudiParams {
  search ?: string
  jenjang?: string
  page   ?: number
  limit  ?: number
}

// ── API Functions ──────────────────────────────────────────────

export async function fetchProgramStudi(
  params: ListProgramStudiParams = {}
): Promise<PaginatedProgramStudi> {
  const res = await api.get<PaginatedProgramStudi>('/admin/program-studi', { params })
  return res.data
}

export async function fetchProgramStudiStats(): Promise<ProgramStudiStats> {
  const res = await api.get<ProgramStudiStats>('/admin/program-studi/stats')
  return res.data
}

export async function fetchProgramStudiAktif(jenjang?: string): Promise<{ items: ProgramStudi[]; total: number }> {
  const res = await api.get('/program-studi/aktif', { params: jenjang ? { jenjang } : {} })
  return res.data
}

export async function createProgramStudi(
  payload: CreateProgramStudiPayload
): Promise<{ message: string; program_studi: ProgramStudi }> {
  const res = await api.post('/admin/program-studi', payload)
  return res.data
}

export async function updateProgramStudi(
  prodiId: string,
  payload: UpdateProgramStudiPayload
): Promise<{ message: string; program_studi: ProgramStudi }> {
  const res = await api.put(`/admin/program-studi/${prodiId}`, payload)
  return res.data
}

export async function deleteProgramStudi(
  prodiId: string
): Promise<{ message: string }> {
  const res = await api.delete(`/admin/program-studi/${prodiId}`)
  return res.data
}

export async function toggleProgramStudi(
  prodiId : string,
  isActive: boolean
): Promise<{ message: string; program_studi: ProgramStudi }> {
  const res = await api.patch(`/admin/program-studi/${prodiId}/toggle`, { is_active: isActive })
  return res.data
}