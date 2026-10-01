import { useEffect, useRef } from 'react';

/** Content is already committed. Motion can be canceled without undoing state. */
export function useBoundedReveal(ref: React.RefObject<HTMLElement>, identity: string | null, enabled = true, animateOnMount = false) {
  const previous = useRef(animateOnMount ? null : identity);
  useEffect(() => {
    const changed = previous.current !== identity;
    previous.current = identity;
    const node = ref.current;
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!changed || !identity || !enabled || !node?.animate || document.hidden || query?.matches) return;
    const animation = node.animate([{ opacity: .45, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 200, easing: 'cubic-bezier(.2,.7,.2,1)' });
    const stop = () => animation.cancel();
    const visibility = () => { if (document.hidden) stop(); };
    const preference = () => { if (query?.matches) stop(); };
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) stop();
    }) : null;
    observer?.observe(node);
    document.addEventListener('visibilitychange', visibility);
    query?.addEventListener?.('change', preference);
    return () => { stop(); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); query?.removeEventListener?.('change', preference); };
  }, [ref, identity, enabled]);
}
