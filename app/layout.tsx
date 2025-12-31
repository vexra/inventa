import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'

import { Toaster } from 'sonner'

import './globals.css'

const roboto = Roboto({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title: 'Inventa - Sistem Manajemen Aset & Persediaan FMIPA Unila',
  description:
    'Platform terintegrasi pengelolaan Aset Tetap dan Barang Habis Pakai (BHP) di Fakultas MIPA Universitas Lampung. Monitoring inventaris dan pelacakan lokasi aset.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className={`${roboto.variable} antialiased`}>
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  )
}
