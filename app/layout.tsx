import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'INDOTEL - Unidad de Viajes',
  description: 'Sistema de automatización para la Unidad de Viajes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
