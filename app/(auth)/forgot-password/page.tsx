'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import Link from 'next/link'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

const formSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
})

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: '/reset-password',
    })

    setIsLoading(false)

    if (error) {
      toast.error('Gagal Mengirim', { description: error.message })
    } else {
      setIsSuccess(true)
      toast.success('Email Terkirim', {
        description: 'Silakan cek inbox atau folder spam Anda.',
      })
    }
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="bg-card text-card-foreground w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-blue-50 p-3 dark:bg-blue-900/20">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Lupa Password?</h1>
          <p className="text-muted-foreground text-sm">
            {isSuccess
              ? 'Email pemulihan telah dikirim.'
              : 'Masukkan email Anda untuk mereset password.'}
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
              Kami telah mengirimkan link reset password ke{' '}
              <strong>{form.getValues('email')}</strong>.
            </div>
            <Button variant="outline" className="w-full" onClick={() => setIsSuccess(false)}>
              Kirim ulang email
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@kantor.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kirim Link Reset
              </Button>
            </form>
          </Form>
        )}

        <div className="mt-4 text-center">
          <Link
            href="/sign-in"
            className="text-muted-foreground inline-flex items-center gap-2 text-sm transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    </div>
  )
}
