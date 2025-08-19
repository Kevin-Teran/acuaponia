import type { Metadata } from 'next';
import '../globals.css';
import { AuthProvider } from '@/context/AuthContext';

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
    <html lang="es">
      <body>
        <AuthProvider> 
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}