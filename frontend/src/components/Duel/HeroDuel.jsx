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

  // Background cut-out algorithm with fast-path for pre-cut transparent WebP assets
  const processCutout = (imgEl) => {
    if (!imgEl) return;
    if (
      imgEl.src.includes('.webp') ||
      imgEl.dataset.cutoutDone === 'true' ||
      imgEl.classList.contains('processed')
    ) {
      imgEl.classList.add('processed', 'show');
      return;
    }
    imgEl.dataset.cutoutDone = 'true';
    try {
      const c = document.createElement('canvas');
      c.width = imgEl.naturalWidth;
      c.height = imgEl.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(imgEl, 0, 0);

      const w = c.width;
      const h = c.height;
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const vis = new Uint8Array(w * h);
      const stack = new Int32Array(w * h);
      let sp = 0;

      const bgLike = (i) => {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2];
        return 0.299 * r + 0.587 * g + 0.114 * b < 32;
      };

      const push = (p) => {
        if (!vis[p]) {
          vis[p] = 1;
          stack[sp++] = p;
        }
      };

      for (let i = 0; i < w; i++) {
        push(i);
        push((h - 1) * w + i);
      }
      for (let j = 0; j < h; j++) {
        push(j * w);
        push(j * w + w - 1);
      }

      while (sp > 0) {
        const p = stack[--sp];
        const i4 = p * 4;
        if (d[i4 + 3] === 0) continue;
        if (!bgLike(i4)) {
          vis[p] = 0;
          continue;
        }
        d[i4 + 3] = 0;
        const pxx = p % w;
        const pyy = (p / w) | 0;
        if (pxx > 0) push(p - 1);
        if (pxx < w - 1) push(p + 1);
        if (pyy > 0) push(p - w);
        if (pyy < h - 1) push(p + w);
      }

      ctx.putImageData(imgData, 0, 0);
      c.toBlob((blob) => {
        if (blob) {
          imgEl.src = URL.createObjectURL(blob);
          imgEl.classList.add('processed');
        }
        imgEl.classList.add('show');
      });
    } catch (e) {
      imgEl.classList.add('show');
    }
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
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 6.28;
      const v = pow * (1 + Math.random() * 4);
      ds.parts.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 1,
        life: 0,
        max: 50 + Math.random() * 40,
        r: 1 + Math.random() * 2.6,
        c: cols[i % cols.length],
        g: 0.05,
      });
    }
  };

  const converge = (x, y, color) => {
    const angle = Math.random() * 6.28;
    const dist = 50 + Math.random() * 50;
    duelState.current.parts.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      tx: x,
      ty: y,
      life: 0,
      max: 26,
      r: 1 + Math.random() * 1.8,
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
      140,
      2.4
    );
    ds.rings.push({ x: lp.x, y: lp.y, r: 6, v: 9, a: 1, c: '240,208,137' });
    ds.rings.push({ x: lp.x, y: lp.y, r: 2, v: 6, a: 1, c: '255,255,255' });

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
      36,
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
    }, 30);

    setTimeout(() => {
      clearInterval(convergeInterval);
      if (side === 'harry') setHarryCharging(false);
      else setVoldyCharging(false);

      ds.shots.push({ side, t: 0 });
      ds.busy[side] = false;
    }, 500);
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

  // 3D Tilt and Spark binding on hover
  const setupWizardInteractions = (el, isHarry) => {
    if (!el) return;
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0,
      H = 0;
    const ds = duelState.current;

    // Generate stars
    ds.stars = [];
    for (let si = 0; si < 150; si++) {
      ds.stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        r: Math.random() * 1.3 + 0.3,
        p: Math.random() * 6.28,
        s: 0.6 + Math.random() * 1.6,
      });
    }

    let ro = null;
    let rafDouble = 0;
    let currentDPR = window.devicePixelRatio || 1;
    let dprQuery = null;

    const syncCanvasSize = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      currentDPR = DPR;
      const rect = hero.getBoundingClientRect();
      const newW = Math.round(rect.width) || hero.clientWidth;
      const newH = Math.round(rect.height) || hero.clientHeight;
      if (!newW || !newH) return;
      if (
        newW === W &&
        newH === H &&
        canvas.width === Math.round(newW * DPR) &&
        canvas.height === Math.round(newH * DPR)
      ) {
        return;
      }
      W = newW;
      H = newH;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const resize = () => syncCanvasSize();

    const handleDprChange = () => {
      resize();
      listenToDpr();
    };

    const listenToDpr = () => {
      if (dprQuery) {
        dprQuery.removeEventListener('change', handleDprChange);
      }
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      dprQuery.addEventListener('change', handleDprChange, { once: true });
    };
    listenToDpr();

    // Initial sync + double rAF to catch fonts/images/dvh layout shift
    resize();
    rafDouble = requestAnimationFrame(() => {
      resize();
      rafDouble = requestAnimationFrame(resize);
    });

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(hero);
    }

    window.addEventListener('resize', resize);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', resize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(resize);
    }

    const handlePointerMove = (e) => {
      ds.mx = e.clientX / window.innerWidth - 0.5;
      ds.my = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const lerp = (a, b, t) => a + (b - a) * t;

    let animId;
    const loop = (t) => {
      const dt = Math.min(32, t - ds.lastT) || 16;
      ds.lastT = t;
      // Guard against missed resize or zoom/DPI change
      const hr = hero.getBoundingClientRect();
      const checkDPR = Math.min(window.devicePixelRatio || 1, 2);
      if (
        Math.abs(hr.width - W) > 0.5 ||
        Math.abs(hr.height - H) > 0.5 ||
        Math.abs(checkDPR - currentDPR) > 0.01
      ) {
        syncCanvasSize();
      }
      ctx.clearRect(0, 0, W, H);

      ds.px += (ds.mx - ds.px) * 0.04;
      ds.py += (ds.my - ds.py) * 0.04;

      if (bgCastleRef.current) {
        bgCastleRef.current.style.transform = `translate3d(${-ds.px * 22}px, ${-ds.py * 12}px, 0) scale(1.06)`;
      }
      if (fogARef.current) {
        fogARef.current.style.transform = `translate3d(${-ds.px * 36}px, ${-ds.py * 14}px, 0)`;
      }
      if (fogBRef.current) {
        fogBRef.current.style.transform = `translate3d(${ds.px * 46}px, ${ds.py * 18}px, 0)`;
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
      if (ds.embers.length < 34 && Math.random() < 0.25) {
        ds.embers.push({
          x: Math.random() * W,
          y: H + 8,
          vy: -(0.35 + Math.random() * 0.8),
          vx: (Math.random() - 0.5) * 0.4,
          p: Math.random() * 6.28,
          r: 0.8 + Math.random() * 1.6,
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
        ctx.shadowColor = '#f0d089';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, 6.28);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Beam and clash orb
      const a = getTipPos(tipHRef.current, true);
      const b = getTipPos(tipVRef.current, false);

      ds.orbT += (ds.orbTarget - ds.orbT) * 0.045;
      const ox = lerp(a.x, b.x, ds.orbT);
      const oy = lerp(a.y, b.y, ds.orbT) + Math.sin(t / 900) * 6;

      // Outer beam
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(255,93,71,.9)');
      g.addColorStop(0.42, 'rgba(255,190,110,.85)');
      g.addColorStop(0.58, 'rgba(150,255,190,.85)');
      g.addColorStop(1, 'rgba(67,224,138,.9)');

      ctx.strokeStyle = g;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.22;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Inner core beam
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.8;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Traveling beads along the beam
      for (let i = 0; i < 6; i++) {
        const q = (t * 0.00028 + i / 6) % 1;
        const p1x = lerp(a.x, ox, q);
        const p1y = lerp(a.y, oy, q);
        const p2x = lerp(b.x, ox, q);
        const p2y = lerp(b.y, oy, q);

        ctx.fillStyle = `rgba(255,150,100,${0.7 * Math.sin(q * Math.PI)})`;
        ctx.shadowColor = '#ff8a50';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p1x, p1y, 2.2, 0, 6.28);
        ctx.fill();

        ctx.fillStyle = `rgba(110,255,170,${0.7 * Math.sin(q * Math.PI)})`;
        ctx.shadowColor = '#43e08a';
        ctx.beginPath();
        ctx.arc(p2x, p2y, 2.2, 0, 6.28);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Tip glow
      const drawTipGlow = (p, col) => {
        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
        rg.addColorStop(0, 'rgba(255,255,255,.9)');
        rg.addColorStop(0.3, col);
        rg.addColorStop(1, 'transparent');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 26, 0, 6.28);
        ctx.fill();
      };
      drawTipGlow(a, 'rgba(255,110,70,.55)');
      drawTipGlow(b, 'rgba(67,224,138,.5)');

      // Central clash orb & sparkle (enlarged & enhanced)
      ds.orbPulse *= 0.92;
      const R = 22 + Math.sin(t / 280) * 3.5 + ds.orbPulse * 15;
      ctx.globalCompositeOperation = 'lighter';

      const rgL = ctx.createRadialGradient(ox - R * 0.55, oy, 0, ox - R * 0.55, oy, R * 2.5);
      rgL.addColorStop(0, 'rgba(255,110,70,.6)');
      rgL.addColorStop(1, 'transparent');
      ctx.fillStyle = rgL;
      ctx.beginPath();
      ctx.arc(ox - R * 0.55, oy, R * 2.5, 0, 6.28);
      ctx.fill();

      const rgR = ctx.createRadialGradient(ox + R * 0.55, oy, 0, ox + R * 0.55, oy, R * 2.5);
      rgR.addColorStop(0, 'rgba(67,224,138,.55)');
      rgR.addColorStop(1, 'transparent');
      ctx.fillStyle = rgR;
      ctx.beginPath();
      ctx.arc(ox + R * 0.55, oy, R * 2.5, 0, 6.28);
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

      // Secondary diagonal sparkle
      const starR2 = starR * 0.58;
      ctx.rotate(0.785);
      ctx.fillStyle = 'rgba(255, 235, 180, 0.75)';
      ctx.beginPath();
      ctx.moveTo(0, -starR2);
      ctx.quadraticCurveTo(0, 0, starR2, 0);
      ctx.quadraticCurveTo(0, 0, 0, starR2);
      ctx.quadraticCurveTo(0, 0, -starR2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -starR2);
      ctx.fill();
      ctx.restore();

      // Ambient clash micro-sparks emitting from the clash center
      if (Math.random() < 0.32 && ds.parts.length < 85) {
        const spAngle = Math.random() * 6.28;
        const spSpd = 1.0 + Math.random() * 2.4;
        const spCol = Math.random() < 0.5 ? '#ffb46a' : '#7dffb8';
        ds.parts.push({
          x: ox,
          y: oy,
          vx: Math.cos(spAngle) * spSpd,
          vy: Math.sin(spAngle) * spSpd - 0.2,
          life: 0,
          max: 18 + Math.random() * 16,
          r: 1.2 + Math.random() * 1.8,
          c: spCol,
          g: 0.03,
        });
      }

      ctx.globalCompositeOperation = 'source-over';

      // Animated spell shots
      for (let i = ds.shots.length - 1; i >= 0; i--) {
        const sh = ds.shots[i];
        sh.t += dt / 650;
        const from = sh.side === 'harry' ? a : b;
        const to = sh.side === 'harry' ? b : a;
        const tt = Math.min(1, sh.t);
        const ex = lerp(from.x, to.x, tt);
        const ey = lerp(from.y, to.y, tt) + Math.sin(tt * Math.PI) * -26;
        const col = sh.side === 'harry' ? '255,140,90' : '110,255,170';

        ds.parts.push({
          x: ex,
          y: ey,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          life: 0,
          max: 22,
          r: 1.4,
          c: `rgba(${col},.8)`,
          g: 0,
        });

        const pg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 20);
        pg.addColorStop(0, '#ffffff');
        pg.addColorStop(0.35, `rgba(${col},.9)`);
        pg.addColorStop(1, 'transparent');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(ex, ey, 20, 0, 6.28);
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
          p.x += (p.tx - p.x) * 0.14;
          p.y += (p.ty - p.y) * 0.14;
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
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, 6.28);
        ctx.stroke();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (vv) vv.removeEventListener('resize', resize);
      if (dprQuery) dprQuery.removeEventListener('change', handleDprChange);
      if (ro) ro.disconnect();
      cancelAnimationFrame(rafDouble);
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animId);
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
        <p className="kicker">THE WIZARDING WORLD PRESENTS</p>
        <h1 className="hero-title">
          <span className="tw">HARRY</span> <span className="tg">POTTER</span>
        </h1>
        <p className="hero-sub">
          <span className="bolt">⚡</span>&nbsp; EGT 2.0 · WIZARDING EDITION &nbsp;
          <span className="bolt">⚡</span>
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
        <i>↓</i>
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
