import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · TechService PWA` : 'TechService PWA';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
