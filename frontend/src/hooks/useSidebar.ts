/**
 * @file useSidebar.ts
 * @description Hook personalizado para gestionar todo el estado y la lógica de la barra lateral.
 * @technical_requirements Centraliza el manejo de `collapsed`, `theme` y `currentModule`,
 * proveyendo una API limpia para que los componentes la usen. Persiste el tema y el estado
 * de colapso en localStorage.
 */
 'use client';

 import { useState, useEffect, useCallback } from 'react';
 
 export const useSidebar = (defaultModule = 'dashboard') => {
   const [collapsed, setCollapsed] = useState(true);
   const [theme, setTheme] = useState<'light' | 'dark'>('light');
   const [currentModule, setCurrentModule] = useState(defaultModule);
 
   useEffect(() => {
     // Cargar estado desde localStorage al iniciar
     const savedCollapsed = localStorage.getItem('sidebarCollapsed');
     const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
 
     if (savedCollapsed) {
       setCollapsed(JSON.parse(savedCollapsed));
     }
     if (savedTheme) {
       setTheme(savedTheme);
     } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
       setTheme('dark');
     }
   }, []);
 
   useEffect(() => {
     // Aplicar clase de tema al documento
     document.documentElement.classList.toggle('dark', theme === 'dark');
     localStorage.setItem('theme', theme);
   }, [theme]);
 
   const handleToggleCollapse = useCallback(() => {
     setCollapsed(prev => {
       const newState = !prev;
       localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
       return newState;
     });
   }, []);
 
   const handleToggleTheme = useCallback(() => {
     setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
   }, []);
 
   const handleModuleChange = useCallback((module: string) => {
     setCurrentModule(module);
   }, []);
 
   return {
     collapsed,
     theme,
     currentModule,
     handleToggleCollapse,
     handleToggleTheme,
     handleModuleChange,
   };
 };