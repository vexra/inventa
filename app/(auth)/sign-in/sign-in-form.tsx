'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { Turnstile } from '@marsidev/react-turnstile'
import { Eye, EyeOff, Layers, Loader2 } from 'lucide-react'
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
  email: z.email({
    message: 'Email tidak valid.',
  }),
  password: z.string().min(1, {
    message: 'Password wajib diisi.',
  }),
})

export default function SignInForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [captchaToken, setCaptchaToken] = useState<string>('')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!captchaToken) {
      toast.error('Validasi Gagal', {
        description: 'Silakan selesaikan captcha terlebih dahulu.',
      })
      return
    }

    setIsLoading(true)

    await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
      },
      {
        fetchOptions: {
          headers: {
            'x-captcha-response': captchaToken,
          },
        },
        onSuccess: (ctx) => {
          const name = ctx.data?.user.name || 'User'
          setIsLoading(false)
          toast.success(`Selamat Datang, ${name}!`, {
            description: 'Anda berhasil masuk ke dalam sistem.',
          })
          router.push('/dashboard')
          router.refresh()
        },
        onError: (ctx) => {
          setIsLoading(false)

          toast.error('Gagal Masuk', {
            description: ctx.error.message || 'Periksa kembali email dan password Anda.',
          })
        },
      },
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center">
              <Layers className="size-6 text-blue-600" />
            </div>
            Inventa
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Masuk Akun</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Masukkan email dan password untuk mengakses Inventa
              </p>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-muted-foreground hover:text-primary text-sm font-medium hover:underline"
                        >
                          Lupa password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="******"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex min-h-16.25 w-full justify-center">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                    onSuccess={(token) => {
                      console.log('Captcha success:', token)
                      setCaptchaToken(token)
                    }}
                    onExpire={() => setCaptchaToken('')}
                    onError={() => toast.error('Gagal memuat Captcha')}
                    options={{
                      theme: 'auto',
                      size: 'flexible',
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={isLoading || !captchaToken}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sedang Masuk...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>

      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/images/architecture-window-home-balcony-office-facade.jpg"
          alt="Inventa Office"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          sizes="(max-width: 1024px) 0vw, 50vw"
        />
      </div>
    </div>
  )
}
