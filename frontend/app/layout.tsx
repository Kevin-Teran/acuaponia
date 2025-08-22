import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

/**
 * Metadatos de la aplicación
 * @type {Metadata}
 */
export const metadata: Metadata = {
  title: 'Acuaponía - Sistema de Monitoreo',
  description: 'Sistema completo de monitoreo para acuaponía con sensores IoT',
  keywords: 'acuaponía, monitoreo, sensores, IoT, agricultura',
  authors: [{ name: 'Desarrollador Senior' }],
}

/**
 * Layout raíz de la aplicación Next.js
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.children - Componentes hijos
 * @returns {JSX.Element} Layout principal
 * @example
 * // Automáticamente usado por Next.js para envolver todas las páginas
 * <RootLayout>
 *   <HomePage />
 * </RootLayout>
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </div>
      </body>
    </html>
  )
}