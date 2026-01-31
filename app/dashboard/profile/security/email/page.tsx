'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Mail, Send } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  newEmail: z.email('Format email tidak valid'),
})

export default function ChangeEmailPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newEmail: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.newEmail === session?.user?.email) {
      form.setError('newEmail', {
        type: 'manual',
        message: 'Email baru tidak boleh sama dengan email saat ini',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await authClient.changeEmail({
        newEmail: values.newEmail,
        callbackURL: '/dashboard/profile',
      })

      if (error) {
        toast.error(error.message || 'Gagal mengirim permintaan ganti email')
      } else {
        toast.success('Link verifikasi dikirim!', {
          description: `Cek inbox ${values.newEmail} untuk konfirmasi.`,
          duration: 5000,
        })

        router.push('/dashboard/profile/security')
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-2 h-8 w-8">
            <Link href="/dashboard/profile/security">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Kembali</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Ganti Email</h1>
        </div>
        <p className="text-muted-foreground ml-8">
          Perbarui alamat email yang terhubung dengan akun Anda.
        </p>
      </div>

      <div className="max-w-lg">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Email Baru</CardTitle>
                <CardDescription className="mt-1">
                  Kami akan mengirimkan link verifikasi ke alamat email baru.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Informasi Penting</AlertTitle>
                  <AlertDescription className="mt-1 text-xs">
                    Email akun Anda tidak akan berubah sampai Anda mengklik link verifikasi yang
                    dikirim ke inbox email baru tersebut.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <FormLabel>Email Saat Ini</FormLabel>
                  <Input
                    value={session?.user?.email || ''}
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Baru</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="nama@contoh.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="flex justify-end gap-3 px-6 py-4">
                <Button variant="outline" asChild disabled={isSubmitting}>
                  <Link href="/dashboard/profile/security">Batal</Link>
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Kirim Verifikasi
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  )
}
