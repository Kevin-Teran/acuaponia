import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
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
 * Configura el proveedor de autenticación, estilos globales, fuente y un footer persistente.
 * @author Kevin Mariano
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.className}>
      <body className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <AuthProvider>
          <main className="flex-grow">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
