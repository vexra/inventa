import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'

import * as schema from '@/db/schema'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import {
  ac,
  faculty_admin,
  super_admin,
  unit_admin,
  unit_staff,
  warehouse_staff,
} from '@/lib/permissions'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset Password - Inventa FMIPA Unila',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="background-color: #f3f4f6; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <div style="background-color: #2563EB; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Inventa FMIPA Unila</h1>
              </div>
              
              <div style="padding: 30px 20px;">
                <h2 style="margin-top: 0; font-size: 18px; color: #1f2937;">Permintaan Reset Password</h2>
                <p style="line-height: 1.6; color: #4b5563;">Halo <strong>${user.name || 'Pengguna'}</strong>,</p>
                <p style="line-height: 1.6; color: #4b5563;">
                  Kami menerima permintaan untuk mereset password akun Inventa Anda. Silakan klik tombol di bawah ini untuk membuat password baru.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${url}" style="background-color: #2563EB; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Atur Ulang Password</a>
                </div>

                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                  Link ini akan kadaluarsa dalam waktu <strong>1 jam</strong>.
                </p>
                <p style="font-size: 14px; color: #6b7280;">
                  Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:
                </p>
                <p style="font-size: 12px; color: #2563EB; word-break: break-all;">${url}</p>
              </div>

              <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  Jika Anda tidak meminta reset password, abaikan email ini.<br>
                  &copy; ${new Date().getFullYear()} Inventa FMIPA Unila.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      })
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        super_admin,
        faculty_admin,
        unit_admin,
        unit_staff,
        warehouse_staff,
      },
      adminRoles: ['super_admin'],
      defaultRole: 'unit_staff',
      bannedUserMessage:
        'Anda telah diblokir dari aplikasi ini. Silakan hubungi tim dukungan jika Anda merasa ini adalah sebuah kesalahan.',
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'unit_staff',
        input: false,
      },
      facultyId: { type: 'string', required: false, input: false },
      unitId: { type: 'string', required: false, input: false },
      warehouseId: { type: 'string', required: false, input: false },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
})
