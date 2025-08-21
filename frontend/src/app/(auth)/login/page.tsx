/**
 * @file page.tsx
 * @description Página de inicio de sesión que renderiza el componente de formulario.
 * @author Kevin Mariano
 * @version 10.0.0
 */
 'use client';

 import { LoginForm } from '@/components/LoginForm';
 import React from 'react';
 
 /**
  * @function LoginPage
  * @description Componente de página principal para la ruta de login.
  * Simplemente renderiza el componente de formulario de inicio de sesión.
  * @returns {JSX.Element} El componente del formulario de inicio de sesión.
  */
 export default function LoginPage() {
   return <LoginForm />;
 }
 