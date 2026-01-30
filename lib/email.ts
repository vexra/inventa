import nodemailer from 'nodemailer'

const port = parseInt(process.env.SMTP_PORT || '1025')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Inventa Admin" <noreply@example.com>',
      to,
      subject,
      html,
    })
    console.log('Message sent: %s', info.messageId)
    return info
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
