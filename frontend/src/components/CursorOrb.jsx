import React, { useEffect, useRef } from 'react';

export default function CursorOrb() {
  const orbRef = useRef(null);

  useEffect(() => {
    let ocx = window.innerWidth / 2;
    let ocy = window.innerHeight / 2;
    let otx = ocx;
    let oty = ocy;
    let animId;

    const handlePointerMove = (e) => {
      otx = e.clientX;
      oty = e.clientY;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const lerp = (a, b, t) => a + (b - a) * t;

    const orbLoop = () => {
      ocx = lerp(ocx, otx, 0.08);
      ocy = lerp(ocy, oty, 0.08);
      if (orbRef.current) {
        orbRef.current.style.transform = `translate3d(${ocx - 170}px, ${ocy - 170}px, 0)`;
      }
      animId = requestAnimationFrame(orbLoop);
    };

    animId = requestAnimationFrame(orbLoop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <div id="cursorOrb" ref={orbRef} aria-hidden="true" />;
}
