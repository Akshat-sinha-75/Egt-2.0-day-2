/**
 * Spawns floating glowing sparks at (x, y) coordinates with custom color and count.
 */
export function spawnSparks(x, y, color = '#f0d089', count = 10) {
  if (typeof document === 'undefined') return;

  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.style.color = color;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    document.body.appendChild(s);

    const angle = Math.random() * 6.28;
    const dist = 30 + Math.random() * 70;
    const anim = s.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0.2)`,
          opacity: 0,
        },
      ],
      {
        duration: 600 + Math.random() * 500,
        easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)',
      }
    );

    anim.onfinish = () => {
      s.remove();
    };
  }
}
