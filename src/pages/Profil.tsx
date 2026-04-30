import { useAuthStore } from '@/stores/authStore'

export default function Profil() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">Profil Saya</h1>
      <p className="text-muted-foreground mt-1 text-sm">Informasi akun administrator.</p>

      <div className="mt-6 max-w-md rounded-xl border border-border bg-card p-5 space-y-3">
        {[
          { label: 'Nama Lengkap', value: user?.nama_lengkap },
          { label: 'NIM/NIDN',     value: user?.nim_nidn },
          { label: 'Email',        value: user?.email },
          { label: 'Role',         value: user?.role },
          { label: 'Program Studi',value: user?.program_studi },
        ].map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground w-32 shrink-0">{row.label}</span>
            <span className="text-sm font-medium text-foreground text-right">{row.value ?? '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}