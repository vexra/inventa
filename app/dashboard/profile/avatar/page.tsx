'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Image as ImageIcon, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  image: z.string().url('Mohon masukkan URL gambar yang valid').or(z.literal('')),
})

export default function AvatarPage() {
  const { data: session } = authClient.useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      image: '',
    },
  })

  const watchedImage = useWatch({
    control: form.control,
    name: 'image',
  })

  useEffect(() => {
    if (session?.user?.image) {
      form.reset({
        image: session.user.image,
      })
    }
  }, [session, form])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    const { error } = await authClient.updateUser({
      image: values.image,
    })

    if (error) {
      toast.error('Gagal update foto')
    } else {
      toast.success('Foto profil berhasil diperbarui')
      router.refresh()
      router.push('/dashboard/profile')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-2 h-8 w-8">
            <Link href="/dashboard/profile">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Kembali</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Foto Profil</h1>
        </div>
        <p className="text-muted-foreground ml-8">Personalisasi akun Anda dengan foto terbaru.</p>
      </div>

      <div className="max-w-lg">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Ubah Avatar</CardTitle>
                <CardDescription className="mt-1">
                  Gunakan URL gambar publik (Direct Link).
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center gap-4 py-2">
                  <Avatar className="border-background ring-muted/20 h-32 w-32 border-4 shadow-md ring-4">
                    <AvatarImage src={watchedImage} className="object-cover" />
                    <AvatarFallback className="bg-muted text-muted-foreground text-4xl font-semibold">
                      {getInitials(session?.user?.name || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-muted-foreground text-xs">Preview Tampilan</p>
                </div>

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Gambar</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/foto-anda.jpg" {...field} />
                      </FormControl>
                      <p className="text-muted-foreground text-[0.8rem]">
                        Pastikan link gambar dapat diakses secara publik.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="flex justify-end px-6 pt-2 pb-6">
                <div className="flex gap-3">
                  <Button variant="outline" asChild disabled={isSubmitting}>
                    <Link href="/dashboard/profile">Batal</Link>
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Avatar
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  )
}
