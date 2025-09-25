/**
 * @file page.tsx
 * @route frontend/src/app/(auth)/recover-password/[token]
 * @description
 * Página que renderiza el componente del formulario para restablecer
 * la contraseña utilizando un token de la URL.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export async function generateStaticParams() {
  return [];
}

export default async function RecoverPasswordPage({ params }: PageProps<{ token: string }>) {
  const { token } = params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <ResetPasswordForm token={token} />
    </div>
  );
}