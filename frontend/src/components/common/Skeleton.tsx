import React from 'react';
import { cn } from '@/utils/cn';

/**
 * @component Skeleton
 * @description Un componente placeholder para indicar estados de carga en la UI.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
    />
  );
};