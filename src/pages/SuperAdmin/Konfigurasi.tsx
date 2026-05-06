// src/pages/SuperAdmin/Konfigurasi.tsx
// Fase E — Halaman konfigurasi sistem (hanya Super Admin)

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings, Save, RotateCcw, Eye, EyeOff,
  ScanFace, MapPin, Clock, AlertOctagon,
  Camera, Info, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { fetchKonfigurasi, bulkUpdateKonfigurasi, type KonfigurasiItem } from '@/api/superadmin.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ── Icon map per key ──────────────────────────────────────────
const KEY_ICONS: Record<string, React.ElementType> = {
  face_threshold:      ScanFace,
  geofencing_radius:   MapPin,
  timezone:            Clock,
  maintenance_mode:    AlertOctagon,
  max_foto_registrasi: Camera,
}

const KEY_COLOR: Record<string, string> = {
  face_threshold:      'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  geofencing_radius:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  timezone:            'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  maintenance_mode:    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  max_foto_registrasi: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
}

// ── Boolean toggle ────────────────────────────────────────────
function BooleanToggle({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const isTrue = value === 'true'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(isTrue ? 'false' : 'true')}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isTrue ? 'bg-rose-500' : 'bg-muted-foreground/30',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
        isTrue ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  )
}

// ── Range slider ──────────────────────────────────────────────
function RangeSlider({
  value, min, max, step = 1, onChange, disabled,
}: {
  value: string; min: number; max: number; step?: number
  onChange: (v: string) => void; disabled?: boolean
}) {
  const num = parseFloat(value) || 0
  const pct = ((num - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <input
        type="range"
        min={min} max={max} step={step}
        value={num}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="w-full accent-primary disabled:opacity-50"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)` }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        <span className="font-semibold text-foreground">{step < 1 ? num.toFixed(1) : num}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

// ── Single config field ───────────────────────────────────────
function KonfigField({
  konfig, value, onChange, isDirty,
}: {
  konfig: KonfigurasiItem
  value: string
  onChange: (v: string) => void
  isDirty: boolean
}) {
  const [showInfo, setShowInfo] = useState(false)
  const Icon = KEY_ICONS[konfig.key] ?? Settings
  const colorClass = KEY_COLOR[konfig.key] ?? 'bg-muted text-muted-foreground'

  const isMaintenanceMode = konfig.key === 'maintenance_mode'
  const isValueTrue = value === 'true'

  return (
    <div className={cn(
      'rounded-xl border border-border p-4 space-y-3 transition-all',
      isDirty && 'border-primary/40 bg-primary/5',
      konfig.is_readonly && 'opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{konfig.label ?? konfig.key}</p>
              {konfig.is_readonly && (
                <Badge variant="outline" className="text-[10px] h-4">Read-only</Badge>
              )}
              {isDirty && (
                <Badge variant="default" className="text-[10px] h-4 bg-primary/20 text-primary border-0">
                  Diubah
                </Badge>
              )}
              {isMaintenanceMode && isValueTrue && (
                <Badge variant="destructive" className="text-[10px] h-4">AKTIF</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{konfig.key}</p>
          </div>
        </div>
        {konfig.deskripsi && (
          <button
            onClick={() => setShowInfo(p => !p)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Description */}
      {showInfo && konfig.deskripsi && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
          {konfig.deskripsi}
        </p>
      )}

      {/* Input */}
      <div>
        {konfig.tipe === 'boolean' ? (
          <div className="flex items-center gap-3">
            <BooleanToggle value={value} onChange={onChange} disabled={konfig.is_readonly} />
            <span className={cn(
              'text-sm font-medium',
              isValueTrue ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
            )}>
              {isValueTrue ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        ) : konfig.tipe === 'float' && konfig.nilai_min && konfig.nilai_max ? (
          <div className="space-y-1">
            <RangeSlider
              value={value}
              min={parseFloat(konfig.nilai_min)}
              max={parseFloat(konfig.nilai_max)}
              step={0.05}
              onChange={onChange}
              disabled={konfig.is_readonly}
            />
          </div>
        ) : konfig.tipe === 'integer' && konfig.nilai_min && konfig.nilai_max ? (
          <div className="space-y-1">
            <RangeSlider
              value={value}
              min={parseInt(konfig.nilai_min)}
              max={parseInt(konfig.nilai_max)}
              step={1}
              onChange={onChange}
              disabled={konfig.is_readonly}
            />
          </div>
        ) : (
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={konfig.is_readonly}
            className="font-mono text-sm"
          />
        )}

        {/* Range hint */}
        {(konfig.tipe === 'float' || konfig.tipe === 'integer') && konfig.nilai_min && konfig.nilai_max && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Rentang: {konfig.nilai_min} — {konfig.nilai_max}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function Konfigurasi() {
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})

  const { data: configs = [], isLoading } = useQuery<KonfigurasiItem[]>({
    queryKey: ['superadmin-konfigurasi'],
    queryFn: fetchKonfigurasi,
  })

  // TanStack Query v5: onSuccess dihapus — pakai useEffect
  useEffect(() => {
    if (configs.length === 0) return
    const init: Record<string, string> = {}
    configs.forEach((k: KonfigurasiItem) => { init[k.key] = k.value })
    setValues(init)
    setOriginalValues(init)
  }, [configs])

  const dirtyKeys = Object.keys(values).filter(k => values[k] !== originalValues[k])
  const hasDirty = dirtyKeys.length > 0

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {}
      dirtyKeys.forEach(k => { payload[k] = values[k] })
      return bulkUpdateKonfigurasi(payload)
    },
    onSuccess: (res) => {
      if (res.berhasil.length > 0) {
        toast.success(`${res.berhasil.length} konfigurasi berhasil disimpan`)
      }
      if (res.gagal.length > 0) {
        res.gagal.forEach(f => toast.error(`${f.key}: ${f.error}`))
      }
      qc.invalidateQueries({ queryKey: ['superadmin-konfigurasi'] })
      // Update original values untuk keys yang berhasil
      setOriginalValues(prev => {
        const next = { ...prev }
        res.berhasil.forEach(k => { next[k] = values[k] })
        return next
      })
    },
    onError: () => toast.error('Gagal menyimpan konfigurasi'),
  })

  const handleReset = () => {
    setValues({ ...originalValues })
  }

  const updateValue = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  // Kelompokkan konfigurasi
  const maintenanceKonfig = configs.find(k => k.key === 'maintenance_mode')
  const isMaintenanceOn = values['maintenance_mode'] === 'true'

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Konfigurasi Sistem</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Parameter teknis sistem presensi. Perubahan langsung berpengaruh ke semua pengguna.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasDirty && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saveMut.isPending}>
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={!hasDirty || saveMut.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {saveMut.isPending ? 'Menyimpan...' : `Simpan${hasDirty ? ` (${dirtyKeys.length})` : ''}`}
          </Button>
        </div>
      </div>

      {/* ── Maintenance mode warning banner ─────────────────── */}
      {isMaintenanceOn && (
        <div className="flex items-center gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
          <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700 dark:text-rose-300">
            <strong>Mode Maintenance aktif</strong> — semua endpoint presensi mahasiswa dinonaktifkan sementara.
          </p>
        </div>
      )}

      {/* ── Unsaved changes bar ──────────────────────────────── */}
      {hasDirty && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-primary flex-1">
            {dirtyKeys.length} konfigurasi belum disimpan: <span className="font-mono text-xs">{dirtyKeys.join(', ')}</span>
          </p>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Menyimpan...' : 'Simpan Sekarang'}
          </Button>
        </div>
      )}

      {/* ── Config cards ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Settings className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Konfigurasi belum tersedia. Pastikan migration Fase E2 sudah dijalankan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map(konfig => (
            <KonfigField
              key={konfig.key}
              konfig={konfig}
              value={values[konfig.key] ?? konfig.value}
              onChange={v => updateValue(konfig.key, v)}
              isDirty={values[konfig.key] !== originalValues[konfig.key]}
            />
          ))}
        </div>
      )}

      {/* ── Info box ─────────────────────────────────────────── */}
      {!isLoading && configs.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border px-4 py-3">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>face_threshold</strong> — nilai kecil = lebih ketat. Klik ikon mata untuk penjelasan detail.</p>
            <p>Perubahan konfigurasi dicatat di <strong>Audit Log</strong> dengan timestamp dan nama admin.</p>
          </div>
        </div>
      )}
    </div>
  )
}