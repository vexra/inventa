'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createDistributionDraft } from '@/lib/actions/distribution' // Server Action kita
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface DistributionFormProps {
  models: { id: string; name: string }[]
  rooms: { id: string; name: string; buildingName: string }[]
  actorId: string
}

export function DistributionForm({ models, rooms, actorId }: DistributionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // State Form Header
  const [modelId, setModelId] = useState('')
  const [totalQuantity, setTotalQuantity] = useState<number>(0)
  const [notes, setNotes] = useState('')
  
  // State Matriks Alokasi: { "room-id-1": 10, "room-id-2": 5 }
  const [allocations, setAllocations] = useState<Record<string, number>>({})

  // Handle perubahan input per ruangan
  const handleAllocationChange = (roomId: string, value: string) => {
    const qty = parseInt(value) || 0
    setAllocations((prev) => ({
      ...prev,
      [roomId]: Math.max(0, qty), // Cegah input minus
    }))
  }

  // Auto-hitung sisa kuota (Menggunakan useMemo agar performa tetap ringan)
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, qty) => sum + qty, 0)
  }, [allocations])

  const remaining = totalQuantity - totalAllocated
  const isReadyToSubmit = remaining === 0 && totalQuantity > 0

  // Eksekusi Submit
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!modelId) return toast.error('Pilih model aset terlebih dahulu!')
    if (totalQuantity <= 0) return toast.error('Total kuota tidak boleh 0!')
    if (!isReadyToSubmit) return toast.error(`Sisa alokasi harus 0! Saat ini sisa ${remaining}`)

    setLoading(true)

    // Filter hanya ruangan yang mendapat jatah > 0
    const targets = Object.entries(allocations)
      .filter(([_, qty]) => qty > 0)
      .map(([roomId, allocatedQuantity]) => ({
        roomId,
        allocatedQuantity,
      }))

    const result = await createDistributionDraft({
      actorId,
      modelId,
      totalQuantity,
      notes,
      targets,
    })

    if (result.success) {
      toast.success(result.message)
      router.push('/dashboard/distributions') // Kembali ke tabel utama distribusi
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 1. KOTAK INFORMASI BARANG (HEADER) */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Barang</CardTitle>
          <CardDescription>Tentukan barang apa yang akan didistribusikan dan total unitnya.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Model / Master Aset <span className="text-red-500">*</span></Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              required
            >
              <option value="">-- Pilih Model Aset --</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Total Kuota (Unit) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="1"
              value={totalQuantity || ''}
              onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label>Catatan Pengiriman (Opsional)</Label>
            <Textarea
              placeholder="Contoh: Bantuan Dikti Tahun 2026 Batch 1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. MATRIKS ALOKASI RUANGAN */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Matriks Alokasi</CardTitle>
            <CardDescription>Ketik jumlah unit yang akan diberikan pada tiap ruangan.</CardDescription>
          </div>
          
          {/* Indikator Sisa Kuota (Warna dinamis) */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-white transition-colors ${
            remaining === 0 && totalQuantity > 0 ? 'bg-green-600' : remaining < 0 ? 'bg-red-600' : 'bg-amber-500'
          }`}>
            {remaining === 0 && totalQuantity > 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            Sisa Kuota: {remaining} Unit
          </div>
        </CardHeader>
        <CardContent>
          {totalQuantity === 0 ? (
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              Masukkan total kuota barang terlebih dahulu untuk mulai mengalokasikan.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto border rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 sticky top-0 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama Ruangan</th>
                    <th className="px-4 py-3 font-medium">Lokasi Gedung</th>
                    <th className="px-4 py-3 font-medium text-right w-40">Alokasi (Unit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-medium">{room.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{room.buildingName}</td>
                      <td className="px-4 py-2 text-right">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className={`text-right ${allocations[room.id] > 0 ? 'border-green-500 bg-green-50' : ''}`}
                          value={allocations[room.id] || ''}
                          onChange={(e) => handleAllocationChange(room.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. TOMBOL SUBMIT */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" disabled={loading || !isReadyToSubmit}>
          {loading ? 'Menyimpan...' : 'Simpan Draft Distribusi'}
        </Button>
      </div>
    </form>
  )
}