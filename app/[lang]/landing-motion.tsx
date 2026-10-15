'use client';

import { useEffect } from 'react';

/** Progressive enhancement: content stays readable before hydration and without motion. */
export default function LandingMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>('.lp-page');
    if (!page) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = () => {};
    const setup = () => {
      cleanup();
      if (media.matches) return;
      const targets = [...page.querySelectorAll<HTMLElement>('[data-reveal]')];
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      targets.forEach(target => {
        if (target.getBoundingClientRect().top > window.innerHeight * 0.95) {
          target.classList.add('lp-will-reveal');
          observer.observe(target);
        }
      });
      const hero = page.querySelector<HTMLElement>('.lp-photo-fan');
      const privacy = page.querySelector<HTMLElement>('.lp-privacy-photo');
      let raf = 0;
      const update = () => {
        raf = 0;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        page.style.setProperty('--read-progress', String(max > 0 ? y / max : 0));
        page.classList.toggle('lp-scrolled', y > 35);
        hero?.style.setProperty('--scroll-drift', `${Math.min(y * 0.09, 55)}px`);
        if (privacy) {
          const rect = privacy.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            privacy.style.setProperty('--image-shift', `${(rect.top / window.innerHeight - 0.5) * 35}px`);
          }
        }
      };
      const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      update();
      cleanup = () => {
        observer.disconnect();
        cancelAnimationFrame(raf);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        targets.forEach(target => target.classList.remove('lp-will-reveal', 'is-revealed'));
        page.style.removeProperty('--read-progress');
        hero?.style.removeProperty('--scroll-drift');
        privacy?.style.removeProperty('--image-shift');
      };
    };
    setup();
    media.addEventListener('change', setup);
    return () => { cleanup(); media.removeEventListener('change', setup); };
  }, []);
  return <div className="lp-reading-progress" aria-hidden="true" />;
}
