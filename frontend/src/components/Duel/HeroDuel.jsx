import React, { useEffect, useRef, useState, useCallback } from 'react';
import { spawnSparks } from '../../utils/sparks';

const HARRY_IMG_URL = '/assets/harry.webp';
const VOLDY_IMG_URL = '/assets/voldy.webp';

export default function HeroDuel({ onScrollToExams }) {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const bgCastleRef = useRef(null);
  const fogARef = useRef(null);
  const fogBRef = useRef(null);
  const flashRef = useRef(null);

  const harryBoxRef = useRef(null);
  const voldyBoxRef = useRef(null);
  const tipHRef = useRef(null);
  const tipVRef = useRef(null);
  const harryImgRef = useRef(null);
  const voldyImgRef = useRef(null);

  const [harryHp, setHarryHp] = useState(100);
  const [voldyHp, setVoldyHp] = useState(100);
  const [hasCast, setHasCast] = useState(false);
  const [victoryState, setVictoryState] = useState({ show: false, winner: '' });
  const [harryCharging, setHarryCharging] = useState(false);
  const [voldyCharging, setVoldyCharging] = useState(false);
  const [harryHit, setHarryHit] = useState(false);
  const [voldyHit, setVoldyHit] = useState(false);
  const [harryFlash, setHarryFlash] = useState(false);
  const [voldyFlash, setVoldyFlash] = useState(false);

  // Mutable duel state for the 60fps canvas loop
  const duelState = useRef({
    hp: { harry: 100, voldy: 100 },
    busy: { harry: false, voldy: false },
    over: false,
    orbT: 0.5,
    orbTarget: 0.5,
    orbPulse: 0,
    parts: [],
    shots: [],
    rings: [],
    embers: [],
    stars: [],
    mx: 0,
    my: 0,
    px: 0,
    py: 0,
    lastT: 0,
  });

  // Optimized mobile check
  const isMobileDevice = typeof window !== 'undefined' && (
    window.innerWidth < 768 ||
    (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent))
  );

  // Background cut-out algorithm: immediately pass transparent WebP assets without canvas parsing
  const processCutout = (imgEl) => {
    if (!imgEl) return;
    imgEl.classList.add('processed', 'show');
    imgEl.dataset.cutoutDone = 'true';
  };

  const getTipPos = (tipEl, isHarry = true) => {
    const cEl = canvasRef.current || heroRef.current;
    if (!cEl) return { x: 0, y: 0 };
    const h = cEl.getBoundingClientRect();
    if (tipEl) {
      const r = tipEl.getBoundingClientRect();
      if (r.width > 0 || r.left > 0 || r.top > 0) {
        return {
          x: r.left + r.width / 2 - h.left,
          y: r.top + r.height / 2 - h.top,
        };
      }
    }
    const box = isHarry ? harryBoxRef.current : voldyBoxRef.current;
    if (box) {
      const br = box.getBoundingClientRect();
      return {
        x: br.left + (isHarry ? br.width * 0.785 : br.width * 0.245) - h.left,
        y: br.top + (isHarry ? br.height * 0.245 : br.height * 0.255) - h.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const spawnDamageFloat = (x, y, text, color) => {
    if (!heroRef.current) return;
    const d = document.createElement('div');
    d.className = 'dmg-float';
    d.textContent = text;
    d.style.color = color;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    heroRef.current.appendChild(d);

    const anim = d.animate(
      [
        { transform: 'translate(-50%, 0)', opacity: 0 },
        { transform: 'translate(-50%, -30px)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -80px)', opacity: 0 },
      ],
      { duration: 1200, easing: 'ease-out' }
    );
    anim.onfinish = () => d.remove();
  };

  const burst = (x, y, cols, count, pow = 1) => {
    const ds = duelState.current;
    const actualCount = isMobileDevice ? Math.min(count, 18) : count;
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * 6.28;
      const v = pow * (1 + Math.random() * 4);
      ds.parts.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 1,
        life: 0,
        max: isMobileDevice ? 28 : (50 + Math.random() * 40),
        r: 1 + Math.random() * 2.4,
        c: cols[i % cols.length],
        g: 0.05,
      });
    }
  };

  const converge = (x, y, color) => {
    const angle = Math.random() * 6.28;
    const dist = 40 + Math.random() * 40;
    duelState.current.parts.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      tx: x,
      ty: y,
      life: 0,
      max: isMobileDevice ? 18 : 26,
      r: 1 + Math.random() * 1.6,
      c: color,
      conv: true,
    });
  };

  const triggerVictory = (winner, loser) => {
    const ds = duelState.current;
    ds.over = true;
    const lp = getTipPos(loser === 'harry' ? tipHRef.current : tipVRef.current, loser === 'harry');

    if (flashRef.current) {
      flashRef.current.animate(
        [{ opacity: 0 }, { opacity: 0.95, offset: 0.2 }, { opacity: 0 }],
        { duration: 900, easing: 'ease-out' }
      );
    }

    burst(
      lp.x,
      lp.y,
      ['#fff0c8', '#f0d089', '#ff5d47', '#43e08a', '#ffffff'],
      isMobileDevice ? 40 : 140,
      2.4
    );
    ds.rings.push({ x: lp.x, y: lp.y, r: 6, v: 9, a: 1, c: '240,208,137' });
    if (!isMobileDevice) {
      ds.rings.push({ x: lp.x, y: lp.y, r: 2, v: 6, a: 1, c: '255,255,255' });
    }

    setTimeout(() => {
      setVictoryState({
        show: true,
        winner: winner === 'harry' ? 'HARRY POTTER WINS' : 'VOLDEMORT WINS',
      });
    }, 800);
  };

  const onImpact = (side) => {
    const target = side === 'harry' ? 'voldy' : 'harry';
    const tip = target === 'harry' ? tipHRef.current : tipVRef.current;
    const p = getTipPos(tip, target === 'harry');
    const ds = duelState.current;

    burst(
      p.x,
      p.y,
      target === 'harry'
        ? ['#ff5d47', '#ffb46a', '#fff0c8']
        : ['#43e08a', '#b6ffd9', '#eafff4'],
      isMobileDevice ? 16 : 36,
      1.4
    );

    ds.rings.push({
      x: p.x,
      y: p.y,
      r: 4,
      v: 5,
      a: 1,
      c: target === 'harry' ? '255,120,80' : '80,230,150',
    });

    ds.orbPulse = 1;
    if (ds.over) return;

    const newHp = Math.max(0, ds.hp[target] - 10);
    ds.hp[target] = newHp;

    if (target === 'harry') {
      setHarryHp(newHp);
      setHarryHit(true);
      setHarryFlash(true);
      setTimeout(() => setHarryHit(false), 600);
      setTimeout(() => setHarryFlash(false), 500);
    } else {
      setVoldyHp(newHp);
      setVoldyHit(true);
      setVoldyFlash(true);
      setTimeout(() => setVoldyHit(false), 600);
      setTimeout(() => setVoldyFlash(false), 500);
    }

    spawnDamageFloat(
      p.x,
      p.y - 40,
      '-10 HP',
      target === 'harry' ? '#ff8a70' : '#7dffb8'
    );

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    ds.orbTarget = clamp(
      0.5 + ((ds.hp.harry - ds.hp.voldy) / 100) * 0.42,
      0.1,
      0.9
    );

    if (newHp === 0) {
      triggerVictory(side, target);
    }
  };

  const castSpell = (side) => {
    const ds = duelState.current;
    if (ds.over || ds.busy[side]) return;
    ds.busy[side] = true;
    setHasCast(true);

    if (side === 'harry') {
      setHarryCharging(true);
    } else {
      setVoldyCharging(true);
    }

    const tip = side === 'harry' ? tipHRef.current : tipVRef.current;
    const color = side === 'harry' ? '#ffb46a' : '#7dffb8';

    const convergeInterval = setInterval(() => {
      const p = getTipPos(tip, side === 'harry');
      converge(p.x, p.y, color);
    }, isMobileDevice ? 60 : 30);

    setTimeout(() => {
      clearInterval(convergeInterval);
      if (side === 'harry') setHarryCharging(false);
      else setVoldyCharging(false);

      ds.shots.push({ side, t: 0 });
      ds.busy[side] = false;
    }, 450);
  };

  const handleBattleAgain = () => {
    const ds = duelState.current;
    ds.hp = { harry: 100, voldy: 100 };
    ds.over = false;
    ds.orbTarget = 0.5;
    setHarryHp(100);
    setVoldyHp(100);
    setVictoryState({ show: false, winner: '' });
    setHasCast(false);
  };

  // 3D Tilt and Spark binding on hover (desktop only)
  const setupWizardInteractions = (el, isHarry) => {
    if (!el || isMobileDevice) return;
    const onEnter = () => {
      const r = el.getBoundingClientRect();
      spawnSparks(
        r.left + r.width / 2,
        r.top + r.height * 0.4,
        isHarry ? '#f0d089' : '#7dffb8',
        8
      );
    };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      const wrap = el.querySelector('.hover-wrap');
      if (wrap) {
        wrap.style.setProperty('--cx', `${dx * 8}px`);
        wrap.style.setProperty('--cy', `${dy * 6}px`);
        wrap.style.setProperty('--rt', `${dx * 3}deg`);
      }
    };

    const onLeave = () => {
      const wrap = el.querySelector('.hover-wrap');
      if (wrap) {
        wrap.style.setProperty('--cx', '0px');
        wrap.style.setProperty('--cy', '0px');
        wrap.style.setProperty('--rt', '0deg');
      }
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  };

  useEffect(() => {
    const cleanupH = setupWizardInteractions(harryBoxRef.current, true);
    const cleanupV = setupWizardInteractions(voldyBoxRef.current, false);
    return () => {
      cleanupH?.();
      cleanupV?.();
    };
  }, []);

  // Initialize Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    let W = 0,
      H = 0;
    const ds = duelState.current;
    const isMobile = window.innerWidth < 768;

    // Generate stars budget adapted for device performance
    const starCount = isMobile ? 22 : 60;
    ds.stars = [];
    for (let si = 0; si < starCount; si++) {
      ds.stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        r: Math.random() * 1.2 + 0.3,
        p: Math.random() * 6.28,
        s: 0.6 + Math.random() * 1.5,
      });
    }

    let ro = null;
    let io = null;
    let rafDouble = 0;
    let isVisible = true;
    let animId = null;
    let tipA = { x: 0, y: 0 };
    let tipB = { x: 0, y: 0 };

    const updateTipCoords = () => {
      tipA = getTipPos(tipHRef.current, true);
      tipB = getTipPos(tipVRef.current, false);
    };

    const syncCanvasSize = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.5);
      const rect = hero.getBoundingClientRect();
      const newW = Math.round(rect.width) || hero.clientWidth || window.innerWidth;
      const newH = Math.round(rect.height) || hero.clientHeight || window.innerHeight;
      if (!newW || !newH) return;

      // Avoid recreating buffer for tiny mobile URL bar height shifts
      if (
        W > 0 &&
        Math.abs(newW - W) < 2 &&
        Math.abs(newH - H) < 65 &&
        canvas.width > 0
      ) {
        W = newW;
        H = newH;
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        updateTipCoords();
        return;
      }

      W = newW;
      H = newH;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      updateTipCoords();
    };

    let resizeTimer = null;
    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        syncCanvasSize();
      }, 60);
    };

    // Initial sync
    syncCanvasSize();
    rafDouble = requestAnimationFrame(() => {
      syncCanvasSize();
      rafDouble = requestAnimationFrame(syncCanvasSize);
    });

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(debouncedResize);
      ro.observe(hero);
    }

    window.addEventListener('resize', debouncedResize, { passive: true });
    window.addEventListener('orientationchange', debouncedResize, { passive: true });

    if (document.fonts?.ready) {
      document.fonts.ready.then(syncCanvasSize);
    }

    const handlePointerMove = (e) => {
      if (isMobile) return;
      ds.mx = e.clientX / window.innerWidth - 0.5;
      ds.my = e.clientY / window.innerHeight - 0.5;
    };
    if (!isMobile) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
    }

    const lerp = (a, b, t) => a + (b - a) * t;

    let tipUpdateTick = 0;
    const maxEmbers = isMobile ? 6 : 14;

    const startLoop = () => {
      if (!animId && isVisible) {
        animId = requestAnimationFrame(loop);
      }
    };

    const stopLoop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    // IntersectionObserver to halt 60fps canvas execution when scrolled offscreen
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            startLoop();
          } else {
            stopLoop();
          }
        },
        { threshold: 0.02 }
      );
      io.observe(hero);
    }

    const loop = (t) => {
      if (!isVisible) {
        animId = null;
        return;
      }

      const dt = Math.min(32, t - ds.lastT) || 16;
      ds.lastT = t;

      // Periodically refresh tip positions (every ~30 frames) without running getBoundingClientRect every frame
      tipUpdateTick++;
      if (tipUpdateTick > 30) {
        tipUpdateTick = 0;
        updateTipCoords();
      }

      ctx.clearRect(0, 0, W, H);

      // Parallax updates (desktop only)
      if (!isMobile) {
        ds.px += (ds.mx - ds.px) * 0.04;
        ds.py += (ds.my - ds.py) * 0.04;

        if (bgCastleRef.current) {
          bgCastleRef.current.style.transform = `translate3d(${-ds.px * 16}px, ${-ds.py * 10}px, 0) scale(1.04)`;
        }
        if (fogARef.current) {
          fogARef.current.style.transform = `translate3d(${-ds.px * 24}px, ${-ds.py * 10}px, 0)`;
        }
        if (fogBRef.current) {
          fogBRef.current.style.transform = `translate3d(${ds.px * 30}px, ${ds.py * 12}px, 0)`;
        }
      }

      // Draw stars
      for (let i = 0; i < ds.stars.length; i++) {
        const s = ds.stars[i];
        const tw = 0.35 + 0.65 * Math.abs(Math.sin((t / 1000) * s.s + s.p));
        ctx.globalAlpha = tw;
        ctx.fillStyle = i % 5 ? '#dfe6ff' : '#f0d089';
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, 6.28);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw drifting embers
      if (ds.embers.length < maxEmbers && Math.random() < 0.18) {
        ds.embers.push({
          x: Math.random() * W,
          y: H + 8,
          vy: -(0.35 + Math.random() * 0.8),
          vx: (Math.random() - 0.5) * 0.4,
          p: Math.random() * 6.28,
          r: 0.8 + Math.random() * 1.5,
        });
      }
      for (let i = ds.embers.length - 1; i >= 0; i--) {
        const e = ds.embers[i];
        e.y += e.vy * dt * 0.06;
        e.x += (e.vx + Math.sin(t / 900 + e.p) * 0.3) * dt * 0.06;
        if (e.y < -10) {
          ds.embers.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t / 300 + e.p);
        ctx.fillStyle = '#f0d089';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, 6.28);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Beam and clash orb
      const a = tipA.x > 0 ? tipA : { x: W * 0.2, y: H * 0.65 };
      const b = tipB.x > 0 ? tipB : { x: W * 0.8, y: H * 0.65 };

      ds.orbT += (ds.orbTarget - ds.orbT) * 0.045;
      const ox = lerp(a.x, b.x, ds.orbT);
      const oy = lerp(a.y, b.y, ds.orbT) + Math.sin(t / 900) * 5;

      // Outer beam
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(255,93,71,.9)');
      g.addColorStop(0.42, 'rgba(255,190,110,.85)');
      g.addColorStop(0.58, 'rgba(150,255,190,.85)');
      g.addColorStop(1, 'rgba(67,224,138,.9)');

      ctx.strokeStyle = g;
      ctx.lineWidth = isMobile ? 3.5 : 4.5;
      ctx.globalAlpha = 0.32;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Inner core beam
      ctx.lineWidth = isMobile ? 1.2 : 1.5;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Traveling beads along the beam
      const beadCount = isMobile ? 3 : 4;
      for (let i = 0; i < beadCount; i++) {
        const q = (t * 0.00028 + i / beadCount) % 1;
        const p1x = lerp(a.x, ox, q);
        const p1y = lerp(a.y, oy, q);
        const p2x = lerp(b.x, ox, q);
        const p2y = lerp(b.y, oy, q);

        ctx.fillStyle = `rgba(255,150,100,${0.75 * Math.sin(q * Math.PI)})`;
        ctx.beginPath();
        ctx.arc(p1x, p1y, 1.8, 0, 6.28);
        ctx.fill();

        ctx.fillStyle = `rgba(110,255,170,${0.75 * Math.sin(q * Math.PI)})`;
        ctx.beginPath();
        ctx.arc(p2x, p2y, 1.8, 0, 6.28);
        ctx.fill();
      }

      // Tip glow
      const drawTipGlow = (p, col) => {
        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, isMobile ? 16 : 22);
        rg.addColorStop(0, 'rgba(255,255,255,.9)');
        rg.addColorStop(0.35, col);
        rg.addColorStop(1, 'transparent');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isMobile ? 16 : 22, 0, 6.28);
        ctx.fill();
      };
      drawTipGlow(a, 'rgba(255,110,70,.55)');
      drawTipGlow(b, 'rgba(67,224,138,.5)');

      // Central clash orb & sparkle
      ds.orbPulse *= 0.92;
      const baseR = isMobile ? 15 : 20;
      const R = baseR + Math.sin(t / 280) * 2.8 + ds.orbPulse * 10;
      ctx.globalCompositeOperation = 'lighter';

      const rgL = ctx.createRadialGradient(ox - R * 0.55, oy, 0, ox - R * 0.55, oy, R * 2);
      rgL.addColorStop(0, 'rgba(255,110,70,.6)');
      rgL.addColorStop(1, 'transparent');
      ctx.fillStyle = rgL;
      ctx.beginPath();
      ctx.arc(ox - R * 0.55, oy, R * 2, 0, 6.28);
      ctx.fill();

      const rgR = ctx.createRadialGradient(ox + R * 0.55, oy, 0, ox + R * 0.55, oy, R * 2);
      rgR.addColorStop(0, 'rgba(67,224,138,.55)');
      rgR.addColorStop(1, 'transparent');
      ctx.fillStyle = rgR;
      ctx.beginPath();
      ctx.arc(ox + R * 0.55, oy, R * 2, 0, 6.28);
      ctx.fill();

      const rgC = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
      rgC.addColorStop(0, '#ffffff');
      rgC.addColorStop(0.35, '#fff4d0');
      rgC.addColorStop(0.7, 'rgba(255,210,130,.85)');
      rgC.addColorStop(1, 'transparent');
      ctx.fillStyle = rgC;
      ctx.beginPath();
      ctx.arc(ox, oy, R, 0, 6.28);
      ctx.fill();

      // Central clash sparkle starburst
      const starR = R * (0.95 + Math.sin(t / 160) * 0.2);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate((t / 1400) % 6.28);
      ctx.fillStyle = 'rgba(255, 255, 245, 0.95)';
      ctx.beginPath();
      ctx.moveTo(0, -starR);
      ctx.quadraticCurveTo(0, 0, starR, 0);
      ctx.quadraticCurveTo(0, 0, 0, starR);
      ctx.quadraticCurveTo(0, 0, -starR, 0);
      ctx.quadraticCurveTo(0, 0, 0, -starR);
      ctx.fill();

      if (!isMobile) {
        // Secondary diagonal sparkle on desktop
        const starR2 = starR * 0.55;
        ctx.rotate(0.785);
        ctx.fillStyle = 'rgba(255, 235, 180, 0.7)';
        ctx.beginPath();
        ctx.moveTo(0, -starR2);
        ctx.quadraticCurveTo(0, 0, starR2, 0);
        ctx.quadraticCurveTo(0, 0, 0, starR2);
        ctx.quadraticCurveTo(0, 0, -starR2, 0);
        ctx.quadraticCurveTo(0, 0, 0, -starR2);
        ctx.fill();
      }
      ctx.restore();

      // Ambient clash micro-sparks emitting from the clash center
      const maxSparks = isMobile ? 18 : 45;
      if (Math.random() < 0.25 && ds.parts.length < maxSparks) {
        const spAngle = Math.random() * 6.28;
        const spSpd = 1.0 + Math.random() * 2.0;
        const spCol = Math.random() < 0.5 ? '#ffb46a' : '#7dffb8';
        ds.parts.push({
          x: ox,
          y: oy,
          vx: Math.cos(spAngle) * spSpd,
          vy: Math.sin(spAngle) * spSpd - 0.2,
          life: 0,
          max: isMobile ? 14 : (16 + Math.random() * 12),
          r: 1.1 + Math.random() * 1.4,
          c: spCol,
          g: 0.03,
        });
      }

      ctx.globalCompositeOperation = 'source-over';

      // Animated spell shots
      for (let i = ds.shots.length - 1; i >= 0; i--) {
        const sh = ds.shots[i];
        sh.t += dt / 600;
        const from = sh.side === 'harry' ? a : b;
        const to = sh.side === 'harry' ? b : a;
        const tt = Math.min(1, sh.t);
        const ex = lerp(from.x, to.x, tt);
        const ey = lerp(from.y, to.y, tt) + Math.sin(tt * Math.PI) * -22;
        const col = sh.side === 'harry' ? '255,140,90' : '110,255,170';

        if (ds.parts.length < maxSparks) {
          ds.parts.push({
            x: ex,
            y: ey,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            life: 0,
            max: isMobile ? 14 : 18,
            r: 1.2,
            c: `rgba(${col},.8)`,
            g: 0,
          });
        }

        const pg = ctx.createRadialGradient(ex, ey, 0, ex, ey, isMobile ? 14 : 18);
        pg.addColorStop(0, '#ffffff');
        pg.addColorStop(0.35, `rgba(${col},.9)`);
        pg.addColorStop(1, 'transparent');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(ex, ey, isMobile ? 14 : 18, 0, 6.28);
        ctx.fill();

        if (sh.t >= 1) {
          ds.shots.splice(i, 1);
          onImpact(sh.side);
        }
      }

      // Render sparks and particles
      for (let i = ds.parts.length - 1; i >= 0; i--) {
        const p = ds.parts[i];
        p.life++;
        if (p.conv) {
          p.x += (p.tx - p.x) * 0.16;
          p.y += (p.ty - p.y) * 0.16;
        } else {
          p.x += p.vx * dt * 0.06;
          p.y += p.vy * dt * 0.06;
          p.vy += (p.g || 0) * dt * 0.06;
        }

        if (p.life >= p.max) {
          ds.parts.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.28);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Render shockwave rings
      for (let i = ds.rings.length - 1; i >= 0; i--) {
        const r = ds.rings[i];
        r.r += r.v * dt * 0.06;
        r.a -= 0.06 * dt * 0.06 * 3;
        if (r.a <= 0) {
          ds.rings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(${r.c},${r.a})`;
        ctx.lineWidth = isMobile ? 1.8 : 2.2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, 6.28);
        ctx.stroke();
      }

      if (isVisible) {
        animId = requestAnimationFrame(loop);
      } else {
        animId = null;
      }
    };

    startLoop();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      cancelAnimationFrame(rafDouble);
      if (!isMobile) {
        window.removeEventListener('pointermove', handlePointerMove);
      }
      stopLoop();
    };
  }, []);

  // Wizard cut-out triggers on image load (WebPs are pre-processed with transparency)
  useEffect(() => {
    [harryImgRef.current, voldyImgRef.current].forEach((img) => {
      if (!img) return;
      img.classList.add('show', 'processed');
      if (img.complete && img.naturalWidth) {
        processCutout(img);
      } else {
        img.addEventListener('load', () => processCutout(img));
        img.addEventListener('error', () => img.classList.add('show', 'processed'));
      }
    });
  }, []);

  const handleKeyDown = (e, side) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      castSpell(side);
    }
  };

  const isHarryWinner = victoryState.show && victoryState.winner.includes('HARRY');
  const isVoldyWinner = victoryState.show && victoryState.winner.includes('VOLDEMORT');

  return (
    <section id="hero" ref={heroRef} aria-label="Harry Potter versus Voldemort">
      <div className="bg-sky"></div>
      <div className="bg-castle" ref={bgCastleRef}></div>
      <div className="bg-shade"></div>
      <div className="fog fog-a" ref={fogARef}></div>
      <div className="fog fog-b" ref={fogBRef}></div>

      <div className="hero-head">
        <div className="hero-adc-badge">
          <img src="/assets/logo.png" alt="Alexa Developers CU" className="adc-logo-icon" />
          <span className="adc-badge-text">ALEXA DEVELOPERS CU PRESENTS</span>
        </div>

        <p className="kicker">THE ANNUAL WIZARDING TOURNAMENT</p>

        <h1 className="hero-title">
          <span className="tw">HARRY</span> <span className="tg">POTTER</span>
        </h1>

        <div className="hero-edition-pill">
          <span className="star-dot">✦</span>
          <span className="edition-text">EGT 2.0 · WIZARDING EDITION</span>
          <span className="star-dot">✦</span>
        </div>

        <p className="hero-desc-line">
          Where Code Meets Magic — Solve Enigmas, Clear Checkpoints &amp; Conquer The Great Duel
        </p>
      </div>

      {/* Harry Wizard Box */}
      <div
        className={`wizard harry ${harryCharging ? 'charging' : ''} ${
          harryHit ? 'hit' : ''
        } ${isVoldyWinner ? 'loser' : ''} ${isHarryWinner ? 'winner' : ''}`}
        ref={harryBoxRef}
        role="button"
        aria-label="Cast a spell as Harry"
        tabIndex={0}
        onClick={() => castSpell('harry')}
        onKeyDown={(e) => handleKeyDown(e, 'harry')}
      >
        <div className="hp-plate">
          <span className="hp-name">HARRY</span>
          <div className={`hp-bar ${harryFlash ? 'dmgflash' : ''}`}>
            <div className="hp-fill" style={{ width: `${harryHp}%` }}></div>
          </div>
          <span className="hp-num">{harryHp}</span>
        </div>
        <div className="hover-wrap">
          <div className="float-wrap">
            <div className="aura"></div>
            <img
              ref={harryImgRef}
              src={HARRY_IMG_URL}
              alt="Harry, young wizard on a broomstick"
              fetchPriority="high"
              decoding="async"
              className="show processed"
              onLoad={() => processCutout(harryImgRef.current)}
              onError={() => harryImgRef.current?.classList.add('show', 'processed')}
            />
            <i className="tip" ref={tipHRef}></i>
          </div>
        </div>
      </div>

      {/* Voldemort Wizard Box */}
      <div
        className={`wizard voldy ${voldyCharging ? 'charging' : ''} ${
          voldyHit ? 'hit' : ''
        } ${isHarryWinner ? 'loser' : ''} ${isVoldyWinner ? 'winner' : ''}`}
        ref={voldyBoxRef}
        role="button"
        aria-label="Cast a spell as Voldemort"
        tabIndex={0}
        onClick={() => castSpell('voldy')}
        onKeyDown={(e) => handleKeyDown(e, 'voldy')}
      >
        <div className="hp-plate">
          <span className="hp-name">VOLDEMORT</span>
          <div className={`hp-bar ${voldyFlash ? 'dmgflash' : ''}`}>
            <div className="hp-fill" style={{ width: `${voldyHp}%` }}></div>
          </div>
          <span className="hp-num">{voldyHp}</span>
        </div>
        <div className="hover-wrap">
          <div className="float-wrap">
            <div className="aura"></div>
            <img
              ref={voldyImgRef}
              src={VOLDY_IMG_URL}
              alt="Voldemort, dark wizard with green magic"
              fetchPriority="high"
              decoding="async"
              className="show processed"
              onLoad={() => processCutout(voldyImgRef.current)}
              onError={() => voldyImgRef.current?.classList.add('show', 'processed')}
            />
            <i className="tip" ref={tipVRef}></i>
          </div>
        </div>
      </div>

      <canvas id="fxCanvas" ref={canvasRef}></canvas>

      <div className={`duel-hint ${hasCast ? 'hidden' : ''}`}>
        <p className="h1">CHOOSE YOUR CHAMPION</p>
        <p className="h2">Tap a wizard to cast a spell</p>
      </div>

      <button
        className="scroll-cue"
        onClick={onScrollToExams}
        aria-label="Scroll to the examination"
      >
        <span>SCROLL</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 10l5 5 5-5" />
        </svg>
      </button>

      <div id="flash" ref={flashRef}></div>

      <div className={`victory ${victoryState.show ? 'show' : ''}`}>
        <div className="v-inner">
          <p className="v-kicker">THE DUEL IS DECIDED</p>
          <h2 className="v-title">{victoryState.winner}</h2>
          <br />
          <button className="v-btn" onClick={handleBattleAgain}>
            BATTLE AGAIN
          </button>
        </div>
      </div>
    </section>
  );
}
