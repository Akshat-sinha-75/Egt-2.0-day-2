import React, { useEffect, useRef } from 'react';

export default function CursorOrb() {
  const orbRef = useRef(null);

  useEffect(() => {
    // Only run on devices with hover mouse pointer
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    let ocx = window.innerWidth / 2;
    let ocy = window.innerHeight / 2;
    let otx = ocx;
    let oty = ocy;
    let animId = null;
    let isMoving = false;
    let idleTimer = null;

    const lerp = (a, b, t) => a + (b - a) * t;

    const orbLoop = () => {
      const dx = otx - ocx;
      const dy = oty - ocy;
      ocx = lerp(ocx, otx, 0.12);
      ocy = lerp(ocy, oty, 0.12);

      if (orbRef.current) {
        orbRef.current.style.transform = `translate3d(${Math.round(ocx - 170)}px, ${Math.round(ocy - 170)}px, 0)`;
      }

      // If settled and pointer not moving, stop loop to save CPU
      if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6 && !isMoving) {
        animId = null;
        return;
      }

      animId = requestAnimationFrame(orbLoop);
    };

    const handlePointerMove = (e) => {
      otx = e.clientX;
      oty = e.clientY;
      isMoving = true;

      if (!animId) {
        animId = requestAnimationFrame(orbLoop);
      }

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        isMoving = false;
      }, 120);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (animId) cancelAnimationFrame(animId);
      clearTimeout(idleTimer);
    };
  }, []);

  return <div id="cursorOrb" ref={orbRef} aria-hidden="true" />;
}
