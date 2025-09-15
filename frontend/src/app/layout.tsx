/**
 * @file layout.tsx
 * @route frontend/src/app
 * @description Layout raíz que envuelve toda la aplicación.
 * Asegura el orden correcto de los proveedores para un funcionamiento sin errores.
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}