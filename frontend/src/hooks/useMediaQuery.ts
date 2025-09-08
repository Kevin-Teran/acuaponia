/**
 * @file useMediaQuery.ts
 * @route frontend/src/hooks
 * @description 
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
}