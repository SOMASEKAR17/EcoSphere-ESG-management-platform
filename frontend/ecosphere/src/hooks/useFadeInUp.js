import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Applies a subtle staggered fade/rise-in to the direct children of the
 * returned ref whenever the given `deps` change (e.g. route change, tab change).
 */
export default function useFadeInUp(deps = []) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const targets = el.children.length ? Array.from(el.children) : [el];

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.06,
          clearProps: 'transform',
        }
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
