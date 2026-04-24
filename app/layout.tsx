import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ABK Pragmia — Gestión de Seguros',
  description: 'Plataforma de gestión de seguros de empresa para ABK Riesgos & Seguros',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
