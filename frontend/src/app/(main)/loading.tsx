/**
 * @file loading.tsx
 * @route frontend/src/app/(main)
 * @description Pantalla de carga para las rutas dentro del layout principal (main).
 * Se muestra automáticamente durante las transiciones de página.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner message="Cargando..." size="lg" />
    </div>
  );
}