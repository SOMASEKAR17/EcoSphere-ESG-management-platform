import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';

/**
 * Sets up Lenis smooth scrolling and syncs it with GSAP's ticker so
 * scroll-driven GSAP animations stay perfectly in step.
 */
export default function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time * 1000);
    }

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}
