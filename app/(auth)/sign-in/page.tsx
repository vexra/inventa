import { Metadata } from 'next'

import SignInForm from './sign-in-form'

export const metadata: Metadata = {
  title: 'Masuk - Inventa FMIPA Unila',
  description:
    'Halaman masuk Inventa - Sistem Manajemen Aset & Persediaan Fakultas MIPA Universitas Lampung.',
}

export default function SignInPage() {
  return <SignInForm />
}
