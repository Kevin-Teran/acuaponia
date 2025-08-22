/**
 * @page LoginPage
 * @route /login
 * @description Página que presenta la interfaz de inicio de sesión a los usuarios.
 * Está diseñada para ser visualmente atractiva y funcional.
 */
 import { LoginForm } from '@/components/auth/LoginForm';
 import { Suspense } from 'react';
 
 /**
  * @component LoginPage
  * @returns {React.ReactElement} La página de login renderizada.
  */
 export default function LoginPage() {
   return (
     <Suspense>
       <LoginForm />
     </Suspense>
   );
 }