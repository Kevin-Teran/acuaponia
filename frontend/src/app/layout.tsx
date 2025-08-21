/**
 * @file layout.tsx
 * @description Layout raíz de la aplicación. Configura la estructura principal y los proveedores de contexto globales.
 * Incluye configuración de fuentes, metadata y envoltura de proveedores como AuthProvider.
 * @author Sistema de Acuaponía SENA
 * @version 1.0.0
 */

 import type { Metadata } from "next";
 import { Inter } from "next/font/google";
 import "./globals.css";
 import { AuthProvider } from "@/context/AuthContext";
 import React from 'react';
 
 const inter = Inter({ subsets: ["latin"] });
 
 export const metadata: Metadata = {
   title: "Sistema de Acuaponía - SENA",
   description: "Plataforma de monitoreo y gestión de sistemas de acuaponía.",
 };
 
 /**
  * @function RootLayout
  * @description Componente de layout raíz que envuelve toda la aplicación.
  * Proporciona el AuthProvider para que el contexto de autenticación esté disponible globalmente.
  * @param {Object} props - Propiedades del componente.
  * @param {React.ReactNode} props.children - Componentes hijos a renderizar.
  * @returns {JSX.Element} El layout de la aplicación.
  */
 export default function RootLayout({
   children,
 }: Readonly<{
   children: React.ReactNode;
 }>) {
   return (
     <html lang="es">
       <body className={inter.className}>
         <AuthProvider>
           {children}
         </AuthProvider>
       </body>
     </html>
   );
 }