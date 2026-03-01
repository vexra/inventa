'use client'

import { useState } from 'react'
import { executeDistribution } from '@/lib/actions/distribution'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'

export function ExecuteButton({ distributionId }: { distributionId: string }) {
  const [loading, setLoading] = useState(false)

  const handleExecute = async () => {
    // Konfirmasi ganda untuk mencegah salah klik
    if (!window.confirm('Eksekusi dropping ini? Sistem akan otomatis menciptakan data barang fisik dan QR Code. Aksi ini tidak dapat dibatalkan.')) {
      return
    }

    setLoading(true)
    const result = await executeDistribution(distributionId)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }

  return (
    <Button 
      size="sm" 
      onClick={handleExecute} 
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Send className="w-4 h-4 mr-2" />
      )}
      {loading ? 'Memproses...' : 'Kirim Barang'}
    </Button>
  )
}