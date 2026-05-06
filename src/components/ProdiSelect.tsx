// src/components/ProdiSelect.tsx
// Komponen dropdown Program Studi yang dipakai di form Mahasiswa & Dosen.
// Load data dari /program-studi/aktif — cache 5 menit via React Query.

import { useQuery } from '@tanstack/react-query'
import { fetchProgramStudiAktif } from '@/api/program_studi.api'
import { cn } from '@/lib/utils'

interface ProdiSelectProps {
  value       : string
  onChange    : (val: string) => void
  error       ?: string
  placeholder ?: string
  className   ?: string
  disabled    ?: boolean
}

export default function ProdiSelect({
  value,
  onChange,
  error,
  placeholder = 'Pilih Program Studi',
  className,
  disabled,
}: ProdiSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey : ['program-studi-aktif'],
    queryFn  : () => fetchProgramStudiAktif(),
    staleTime: 5 * 60 * 1000,  // cache 5 menit
  })

  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className={cn(
          'w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none',
          'focus:ring-2 focus:ring-ring/50 transition-all',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error ? 'border-destructive' : 'border-border',
          className,
        )}
      >
        <option value="">{isLoading ? 'Memuat...' : placeholder}</option>
        {data?.items.map(prodi => (
          <option key={prodi.id} value={prodi.nama}>
            {prodi.kode} — {prodi.nama} ({prodi.jenjang ?? '-'})
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}