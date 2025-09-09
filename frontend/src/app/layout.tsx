/**
 * @file layout.tsx
 * @route frontend/src/app
 * @description 
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SENA Acuaponia',
  description: 'Plataforma de monitoreo de sistemas acuapónicos.',
  icons: {
    icon: '/logo-sena.png',
  },
};

/**
 * @layout RootLayout
 * @description Layout principal que envuelve toda la aplicación.
 * Configura los proveedores de autenticación y tema, estilos globales y fuente.
 * @author Kevin Mariano
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <AuthProvider>
          <ThemeProvider>
            <main className="flex-grow">{children}</main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}