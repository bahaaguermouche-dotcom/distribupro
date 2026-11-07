import { useEffect } from 'react';

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  useEffect(() => {
    let barcode = '';
    let lastKeyTime = Date.now();
    
    // Le délai maximum entre deux touches tapées par la douchette (en ms)
    // Un humain tape plus lentement que 30ms, une douchette est très rapide.
    const THRESHOLD = 30; 

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer les touches spéciales (sauf Entrée)
      if (e.key.length > 1 && e.key !== 'Enter') return;

      const currentTime = Date.now();
      
      // Si trop de temps s'est écoulé, on réinitialise (c'était une frappe humaine lente)
      if (currentTime - lastKeyTime > THRESHOLD) {
        barcode = '';
      }
      
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        // Si on a accumulé un code assez long, c'est un scan valide
        if (barcode.length >= 4) {
          onScan(barcode);
          e.preventDefault(); // Empêcher l'action par défaut d'Entrée
        }
        barcode = '';
      } else {
        // Ajouter le caractère (généralement des chiffres pour un code-barres)
        barcode += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
}
