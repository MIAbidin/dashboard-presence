// src/api/jadwal_pengganti.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk Fase 8 — Jadwal Pengganti Management
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface JadwalPengganti {
  id              : string
  matakuliah_id   : string
  kode_mk         : string
  nama_matakuliah : string
  dosen_id        : string
  nama_dosen      : string
  nidn            : string
  pertemuan_ke    : number
  jam_mulai_baru  : string | null   // "HH:MM"
  jam_selesai_baru: string | null   // "HH:MM"
  ruangan_baru    : string | null
  keterangan      : string | null
  created_at      : string | null
  updated_at      : string | null
}

export interface ListJadwalPenggantiResponse {
  total: number
  items: JadwalPengganti[]
}

export interface ListJadwalPenggantiParams {
  matakuliah_id?: string
  dosen_id     ?: string
}

// ── API Functions ──────────────────────────────────────────────

export async function fetchJadwalPengganti(
  params: ListJadwalPenggantiParams = {}
): Promise<ListJadwalPenggantiResponse> {
  const res = await api.get<ListJadwalPenggantiResponse>(
    '/admin/jadwal-pengganti',
    { params }
  )
  return res.data
}

export async function deleteJadwalPengganti(
  jpId: string
): Promise<{ message: string }> {
  const res = await api.delete(`/admin/jadwal-pengganti/${jpId}`)
  return res.data
}