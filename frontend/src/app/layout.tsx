import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext'; // Importamos nuestro AuthProvider

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema de Acuaponía',
  description: 'Monitoreo y gestión de sistemas de acuaponía - SENA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark"> {/* Puedes quitar 'dark' si quieres que inicie en modo claro */}
      <body className={inter.className}>
        {/* Envolvemos toda la aplicación con el AuthProvider */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}