import { useEffect, useState } from 'react';

/**
 * Height (px) by which the on-screen keyboard overlaps the bottom of the layout
 * viewport.
 *
 * With `interactive-widget=resizes-visual` (set in `_app`) the virtual keyboard
 * shrinks only the *visual* viewport — our `100dvh` containers stay full-height
 * so nothing reflows. The trade-off is that a sheet anchored to the bottom now
 * sits behind the keyboard. This hook reports how far the keyboard covers the
 * bottom so such a sheet can lift itself to sit snug above the keys.
 *
 * Returns 0 when no keyboard is shown or the VisualViewport API is unavailable
 * (older browsers / SSR), in which case callers fall back to their natural
 * bottom-anchored layout.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      // Portion of the (full-height) layout viewport hidden by the keyboard at
      // the bottom. `offsetTop` accounts for any visual-viewport scroll the
      // browser applies to keep the focused field visible.
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > 1 ? covered : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
