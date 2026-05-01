// src/api/import.api.ts
// ─────────────────────────────────────────────────────────────
// API calls untuk Fase 9 — Import Data Massal
// ─────────────────────────────────────────────────────────────

import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────

export interface PreviewRow {
  baris        : number
  nim_nidn     : string
  nama_lengkap : string
  email        : string
  program_studi: string
  password     : string
  keterangan   : string
  valid        : boolean
  error        : string | null
}

export interface PreviewResult {
  total  : number
  preview: PreviewRow[]
  pesan  : string
}

export interface ImportError {
  baris: number
  nim  : string
  nidn ?: string
  pesan: string
}

export interface ImportResult {
  total   : number
  berhasil: number
  gagal   : number
  errors  : ImportError[]
  preview : Omit<PreviewRow, 'valid' | 'error' | 'password' | 'keterangan'>[]
  pesan   : string
}

// ── API Functions ──────────────────────────────────────────────

/** Preview 5 baris pertama tanpa insert ke DB */
export async function previewImportMahasiswa(file: File): Promise<PreviewResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<PreviewResult>('/admin/import/preview/mahasiswa', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function previewImportDosen(file: File): Promise<PreviewResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<PreviewResult>('/admin/import/preview/dosen', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/** Import sesungguhnya — insert ke DB */
export async function importMahasiswa(file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<ImportResult>('/admin/import/mahasiswa', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function importDosen(file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<ImportResult>('/admin/import/dosen', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/** Download template Excel */
export function downloadTemplateMahasiswa() {
  window.open('/api/admin/import/template/mahasiswa', '_blank')
}

export function downloadTemplateDosen() {
  window.open('/api/admin/import/template/dosen', '_blank')
}