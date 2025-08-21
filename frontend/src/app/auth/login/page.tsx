import { LoginForm } from '@/components/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Sistema de Acuaponía',
  description: 'Página de inicio de sesión para el sistema de monitoreo de acuaponía.',
};

export default function LoginPage() {
  return <LoginForm />;
}