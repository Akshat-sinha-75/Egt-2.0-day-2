import React, { useEffect, useState, useRef } from 'react';
import { spawnSparks } from '../../utils/sparks';

const HALL_CANDLES = [
  { left: '6%', top: '22%', dur: '6.5s', del: '-1s' },
  { left: '13%', top: '60%', dur: '7.6s', del: '-3s' },
  { left: '27%', top: '9%', dur: '6.9s', del: '-5s' },
  { right: '7%', top: '18%', dur: '7.2s', del: '-2s' },
  { right: '14%', top: '56%', dur: '6.4s', del: '-4s' },
  { right: '27%', top: '8%', dur: '7.9s', del: '-6s' },
];

const MAGICAL_OBJECTS = [
  {
    id: 'snitch',
    x: 12,
    y: 16,
    w: 120,
    dur: '5.6s',
    del: '0s',
    svg: (
      <svg viewBox="0 0 140 90">
        <defs>
          <radialGradient id="snG" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="45%" stopColor="#e9b83f" />
            <stop offset="100%" stopColor="#8a5a12" />
          </radialGradient>
          <linearGradient id="snW" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdf6e3" />
            <stop offset="100%" stopColor="#c9b98a" />
          </linearGradient>
        </defs>
        <g className="wing wing-l">
          <path
            d="M62 45 C50 16 24 4 4 12 C15 17 17 24 10 28 C23 28 27 35 20 40 C33 39 39 44 37 51 C46 47 55 47 62 50 Z"
            fill="url(#snW)"
          />
        </g>
        <g className="wing wing-r">
          <path
            d="M78 45 C90 16 116 4 136 12 C125 17 123 24 130 28 C117 28 113 35 120 40 C107 39 101 44 103 51 C94 47 85 47 78 50 Z"
            fill="url(#snW)"
          />
        </g>
        <circle cx="70" cy="47" r="16" fill="url(#snG)" />
        <path
          d="M58 40 C64 36 76 36 82 40 M56 50 C64 55 76 55 84 50"
          stroke="#7a4d0e"
          strokeWidth="1.6"
          fill="none"
          opacity="0.7"
        />
        <circle cx="64" cy="41" r="4" fill="#fff" opacity="0.55" />
      </svg>
    ),
  },
  {
    id: 'lightning',
    x: 47,
    y: 6,
    w: 56,
    dur: '6.8s',
    del: '-2s',
    svg: (
      <svg viewBox="0 0 60 100">
        <defs>
          <linearGradient id="ltG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="100%" stopColor="#d8912a" />
          </linearGradient>
        </defs>
        <path
          d="M36 2 L10 54 H28 L20 98 L50 40 H31 Z"
          fill="url(#ltG)"
          stroke="#8a5a12"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    id: 'owl',
    x: 90,
    y: 30,
    w: 92,
    dur: '6.6s',
    del: '-3s',
    svg: (
      <svg viewBox="0 0 90 100">
        <defs>
          <radialGradient id="owG" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b9b3cf" />
          </radialGradient>
        </defs>
        <path d="M20 30 L14 14 L30 22 Z M70 30 L76 14 L60 22 Z" fill="#8f88ad" />
        <path
          d="M20 30 C14 60 20 82 45 92 C70 82 76 60 70 30 C64 14 26 14 20 30 Z"
          fill="url(#owG)"
        />
        <path
          d="M18 40 C10 56 14 70 24 78 C20 62 20 50 24 40 Z"
          fill="#8f88ad"
        />
        <path
          d="M72 40 C80 56 76 70 66 78 C70 62 70 50 66 40 Z"
          fill="#8f88ad"
        />
        <circle cx="35" cy="34" r="8" fill="#f3d27e" />
        <circle cx="55" cy="34" r="8" fill="#f3d27e" />
        <circle cx="35" cy="34" r="3.4" fill="#1a1206" />
        <circle cx="55" cy="34" r="3.4" fill="#1a1206" />
        <path d="M45 40 l-4 6 h8 Z" fill="#c98a4b" />
        <path
          d="M30 62 C38 70 52 70 60 62 M32 72 C40 79 50 79 58 72"
          stroke="#9a93b5"
          strokeWidth="1.6"
          fill="none"
        />
      </svg>
    ),
  },
  {
    id: 'potion',
    x: 9,
    y: 58,
    w: 78,
    dur: '7.4s',
    del: '-1s',
    svg: (
      <svg viewBox="0 0 80 100">
        <defs>
          <radialGradient id="poL" cx="40%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#b6ffd9" />
            <stop offset="45%" stopColor="#3ddc8a" />
            <stop offset="100%" stopColor="#0e7a44" />
          </radialGradient>
        </defs>
        <rect x="32" y="8" width="16" height="10" rx="2" fill="#8a5a2c" />
        <rect
          x="30"
          y="16"
          width="20"
          height="18"
          fill="rgba(200,230,255,.25)"
          stroke="#9fb6d8"
          strokeWidth="1.5"
        />
        <path
          d="M30 34 C14 42 8 56 10 68 C12 84 26 94 40 94 C54 94 68 84 70 68 C72 56 66 42 50 34 Z"
          fill="rgba(200,230,255,.18)"
          stroke="#9fb6d8"
          strokeWidth="1.5"
        />
        <path
          d="M12 62 C14 50 24 42 40 42 C56 42 66 50 68 62 C68 78 56 90 40 90 C24 90 12 78 12 62 Z"
          fill="url(#poL)"
        />
        <circle className="po-b1" cx="32" cy="66" r="3" fill="#d6ffe9" />
        <circle className="po-b2" cx="46" cy="72" r="2.4" fill="#d6ffe9" />
        <circle className="po-b3" cx="40" cy="58" r="1.8" fill="#eafff4" />
      </svg>
    ),
  },
  {
    id: 'broom',
    x: 40,
    y: 86,
    w: 120,
    dur: '6.2s',
    del: '-2.6s',
    svg: (
      <svg viewBox="0 0 150 60">
        <defs>
          <linearGradient id="brH" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b4326" />
            <stop offset="100%" stopColor="#9a6a34" />
          </linearGradient>
        </defs>
        <path
          d="M6 28 C30 24 62 24 92 26 L92 34 C62 36 30 36 6 34 Z"
          fill="url(#brH)"
        />
        <rect x="90" y="22" width="10" height="16" rx="3" fill="#a32020" />
        <path
          d="M100 20 C118 12 136 14 146 22 C138 25 136 29 140 33 C132 40 116 40 100 38 Z"
          fill="#d8a04a"
        />
        <path
          d="M104 26 L138 21 M104 30 L142 29 M104 34 L136 37"
          stroke="#b98434"
          strokeWidth="1.4"
          opacity="0.8"
          fill="none"
        />
      </svg>
    ),
  },
  {
    id: 'letter',
    x: 85,
    y: 78,
    w: 104,
    dur: '6.4s',
    del: '-1.4s',
    svg: (
      <svg viewBox="0 0 120 84">
        <rect
          x="6"
          y="6"
          width="108"
          height="72"
          rx="4"
          fill="#e9dcc0"
          stroke="#c9b98a"
        />
        <path
          d="M6 10 L60 46 L114 10"
          fill="none"
          stroke="#b9a878"
          strokeWidth="2"
        />
        <circle cx="60" cy="48" r="10" fill="#a32020" />
        <circle cx="60" cy="48" r="6.5" fill="#c33030" />
        <path d="M57 48 h6 M60 45 v6" stroke="#f0d089" strokeWidth="1.6" />
        <path
          d="M20 66 h30 M20 72 h22"
          stroke="#8a7a58"
          strokeWidth="2"
          opacity="0.7"
        />
      </svg>
    ),
  },
];

function FloatingItem({ obj }) {
  const [isActive, setIsActive] = useState(false);
  const finRef = useRef(null);
  const lastSparkRef = useRef(0);
  const touchTimerRef = useRef(null);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const handlePointerMove = (e) => {
    if (!finRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);

    finRef.current.style.setProperty('--fx', `${clamp(dx * 0.18, -14, 14)}px`);
    finRef.current.style.setProperty('--fy', `${clamp(dy * 0.18, -14, 14)}px`);
    finRef.current.style.setProperty('--fr', `${clamp(dx * 0.25, -14, 14)}deg`);

    const now = Date.now();
    if (now - lastSparkRef.current > 140) {
      lastSparkRef.current = now;
      spawnSparks(e.clientX, e.clientY, '#f0d089', 2);
    }
  };

  const handlePointerLeave = () => {
    setIsActive(false);
    if (finRef.current) {
      finRef.current.style.setProperty('--fx', '0px');
      finRef.current.style.setProperty('--fy', '0px');
      finRef.current.style.setProperty('--fr', '0deg');
    }
  };

  const handleTouchStart = (e) => {
    setIsActive(true);
    const t = e.touches[0];
    if (t) spawnSparks(t.clientX, t.clientY, '#f0d089', 10);
    clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => setIsActive(false), 1200);
  };

  return (
    <div
      className={`fobj ${isActive ? 'active' : ''}`}
      style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
      onPointerEnter={() => setIsActive(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
    >
      <div
        className="bob"
        style={{ '--dur': obj.dur, '--del': obj.del }}
      >
        <div
          className="fin"
          ref={finRef}
          style={{ width: `${obj.w}px` }}
        >
          {obj.svg}
        </div>
      </div>
    </div>
  );
}

export default function GrandHall() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const generated = [];
    const rand = (a, b) => a + Math.random() * (b - a);
    for (let k = 0; k < 44; k++) {
      generated.push({
        id: k,
        left: `${rand(1, 99)}%`,
        top: `${rand(2, 62)}%`,
        animationDelay: `${-rand(0, 3)}s`,
        opacity: rand(0.3, 0.9),
        background: k % 4 === 0 ? '#f0d089' : '#e8ecff',
      });
    }
    setStars(generated);
  }, []);

  return (
    <div className="hall">
      <div className="hall-stars" id="hallStars">
        {stars.map((s) => (
          <span
            key={s.id}
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.animationDelay,
              opacity: s.opacity,
              background: s.background,
            }}
          />
        ))}
      </div>

      <div className="constellation" aria-hidden="true">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
          <g stroke="rgba(216,171,82,.22)" strokeWidth="1" fill="none">
            <path d="M150 140 L260 210 L380 160 L470 260" />
            <path d="M730 150 L850 230 L970 170 L1060 300" />
            <path d="M220 470 L360 410 L500 480" />
            <path d="M700 480 L840 420 L980 490" />
          </g>
          <g>
            <circle cx="150" cy="140" r="2.2" />
            <circle cx="260" cy="210" r="1.6" style={{ animationDelay: '0.7s' }} />
            <circle cx="380" cy="160" r="2" style={{ animationDelay: '1.4s' }} />
            <circle cx="470" cy="260" r="1.5" style={{ animationDelay: '2.1s' }} />
            <circle cx="730" cy="150" r="2" style={{ animationDelay: '0.4s' }} />
            <circle cx="850" cy="230" r="1.6" style={{ animationDelay: '1.1s' }} />
            <circle cx="970" cy="170" r="2.2" style={{ animationDelay: '1.8s' }} />
            <circle cx="1060" cy="300" r="1.5" style={{ animationDelay: '2.5s' }} />
            <circle cx="220" cy="470" r="1.8" style={{ animationDelay: '0.9s' }} />
            <circle cx="360" cy="410" r="2.2" style={{ animationDelay: '1.6s' }} />
            <circle cx="500" cy="480" r="1.5" style={{ animationDelay: '2.3s' }} />
            <circle cx="700" cy="480" r="1.6" style={{ animationDelay: '0.2s' }} />
            <circle cx="840" cy="420" r="2" style={{ animationDelay: '1.3s' }} />
            <circle cx="980" cy="490" r="1.7" style={{ animationDelay: '2s' }} />
          </g>
        </svg>
      </div>

      {HALL_CANDLES.map((c, idx) => (
        <span
          key={idx}
          className="candle"
          style={{
            ...(c.left ? { left: c.left } : { right: c.right }),
            top: c.top,
            '--dur': c.dur,
            '--del': c.del,
          }}
        />
      ))}

      <p className="label reveal" style={{ textAlign: 'center' }}>
        THE FINAL CHAMBER
      </p>

      <div className="float-field" id="floatField">
        <svg className="bb-ring" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          <circle
            cx="200"
            cy="200"
            r="192"
            stroke="#d8ab5233"
            strokeWidth="1"
            strokeDasharray="3 10"
          />
          <circle
            cx="200"
            cy="200"
            r="160"
            stroke="#8f9bd822"
            strokeWidth="1"
            strokeDasharray="1 7"
          />
          <circle cx="200" cy="8" r="3" fill="#f3d27e" />
          <circle cx="392" cy="200" r="2.4" fill="#d8ab52" />
          <circle cx="200" cy="392" r="2.6" fill="#f3d27e" />
          <circle cx="8" cy="200" r="2" fill="#d8ab52" />
        </svg>

        <div className="bb-title reveal">
          <h2>
            <span className="w">EGT</span>
            <span className="g">2.0</span>
          </h2>
          <p className="bb-sub">WHERE IDEAS BECOME MAGIC</p>
          <p className="bb-tag">Build · Create · Innovate</p>
        </div>

        {MAGICAL_OBJECTS.map((obj) => (
          <FloatingItem key={obj.id} obj={obj} />
        ))}
      </div>
    </div>
  );
}
