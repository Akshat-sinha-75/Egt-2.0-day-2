import React, { useState, useEffect, useRef } from 'react';
import { spawnSparks } from '../../utils/sparks';

export default function Footer() {
  const [showCredits, setShowCredits] = useState(false);
  const [showToTop, setShowToTop] = useState(false);
  const [embers, setEmbers] = useState([]);
  const creditsBtnRef = useRef(null);
  const creditsPopRef = useRef(null);

  useEffect(() => {
    // Generate 16 rising dust embers
    const generated = [];
    for (let k = 0; k < 16; k++) {
      generated.push({
        id: k,
        left: `${Math.random() * 100}%`,
        animationDuration: `${7 + Math.random() * 9}s`,
        animationDelay: `${-Math.random() * 12}s`,
        size: `${2 + Math.random() * 2}px`,
      });
    }
    setEmbers(generated);

    const handleScroll = () => {
      setShowToTop(window.scrollY > 600);
    };

    const handleClickOutside = (e) => {
      if (
        creditsPopRef.current &&
        !creditsPopRef.current.contains(e.target) &&
        creditsBtnRef.current &&
        !creditsBtnRef.current.contains(e.target)
      ) {
        setShowCredits(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSocialHover = (e, color = '#f0d089') => {
    const r = e.currentTarget.getBoundingClientRect();
    spawnSparks(r.left + r.width / 2, r.top + r.height / 2, color, 6);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <>
      <svg
        className="skyline"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,120 L0,86 60,86 60,64 74,64 74,86 130,86 130,52 138,30 146,52 146,86 210,86 210,70 250,70 250,86 320,86 320,44 330,20 340,44 340,86 420,86 420,66 470,66 470,86 540,86 540,58 552,58 552,36 560,16 568,36 568,58 580,58 580,86 660,86 660,70 700,70 700,86 780,86 780,48 790,26 800,48 800,86 880,86 880,64 930,64 930,86 1000,86 1000,56 1010,34 1020,56 1020,86 1100,86 1100,70 1140,70 1140,86 1200,86 1200,120 Z" />
      </svg>

      <div className="foot" id="contact">
        <div className="foot-dust" id="footDust">
          {embers.map((em) => (
            <span
              key={em.id}
              className="ember"
              style={{
                left: em.left,
                animationDuration: em.animationDuration,
                animationDelay: em.animationDelay,
                width: em.size,
                height: em.size,
              }}
            />
          ))}
        </div>

        <div className="divider">
          <span>✦</span>
        </div>

        <div className="foot-grid">
          <div className="f-brand reveal">
            <svg className="emblem" viewBox="0 0 60 60" aria-hidden="true">
              <defs>
                <linearGradient id="emG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f8e2a6" />
                  <stop offset="1%" stopColor="#b9862a" />
                </linearGradient>
              </defs>
              <circle
                cx="30"
                cy="30"
                r="27"
                fill="none"
                stroke="url(#emG)"
                strokeWidth="1.6"
              />
              <path
                d="M33 12 L20 34 h9 L25 48 L40 26 h-9 Z"
                fill="url(#emG)"
              />
              <path
                d="M4 30 C10 22 16 22 20 27 M56 30 C50 22 44 22 40 27"
                stroke="url(#emG)"
                strokeWidth="1.6"
                fill="none"
              />
            </svg>
            <p className="f-name"> EGT 2.0</p>
            <p className="f-ed">WIZARDING EDITION</p>
            <p className="f-desc">
              Where ideas become magic — a tournament of builders, dreamers and
              makers.
            </p>
          </div>

          <nav className="f-col reveal" aria-label="Footer Navigation">
            <h4>NAVIGATE</h4>
            <div className="f-nav">
              <a href="#hero">HOME</a>
              <a href="#exams">EXAMS</a>
              <a href="#buildathon">BUILDATHON</a>
              <a href="mailto:community@egt2.0.in">CONTACT US</a>
            </div>
          </nav>

          <div className="f-col f-right reveal">
            <h4>OWL POST</h4>
            <div className="socials">
              <a
                className="soc"
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                onPointerEnter={handleSocialHover}
              >
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle
                    cx="17.4"
                    cy="6.6"
                    r="1.1"
                    style={{ fill: 'var(--gold)' }}
                    stroke="none"
                  />
                </svg>
              </a>
              <a
                className="soc"
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                onPointerEnter={handleSocialHover}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4.5 9.5v11M4.5 4.6v.1M10 20.5v-7c0-2.2 1.6-4 3.9-4s4.1 1.8 4.1 4v7" />
                </svg>
              </a>
              <a
                className="soc"
                href="https://wa.me/917533811283"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                onPointerEnter={handleSocialHover}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" />
                  <path d="M8.8 8.8c-.3.3-.4 1 0 1.9.6 1.4 1.9 2.9 3.9 3.9 1 .5 1.8.5 2.2.2l.8-1-1.9-1.2-.8.7c-1-.5-1.9-1.4-2.4-2.4l.7-.8-1.2-1.9Z" />
                </svg>
              </a>
            </div>
            <a className="contact-btn" href="mailto:community@egt2.0.in">
              CONTACT US
            </a>
          </div>

          <div className="f-col f-community reveal">
            <h4 className="it">COMMUNITY</h4>
            <p>
              <b>EGT 2.0</b>
              <br />
              Community Manager · +91 75338 11283
              <br />
              <span className="mm">“Mischief Managed”</span> 🪄
            </p>
          </div>
        </div>

        <div className="foot-end">
          <p className="fe-name"> EGT 2.0</p>
          <p className="fe-ed">· WIZARDING EDITION ·</p>
          <p className="fe-magic">Made with magic &amp; code.</p>
        </div>

        <div className="foot-bottom">
          <p>© 2026 EGT 2.0 · ALL ENCHANTMENTS RESERVED</p>
          <button
            id="creditsBtn"
            ref={creditsBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowCredits((prev) => !prev);
            }}
          >
            CREDITS ✦
          </button>
        </div>
      </div>

      <div
        id="creditsPop"
        ref={creditsPopRef}
        className={showCredits ? 'show' : ''}
      >
        A fan-made concept crafted for the  EGT 2.0.
        Wizarding motifs inspired by the world of Harry Potter. Built with ✦ by
        the GeeksforGeeks CII community.
      </div>

      <button
        id="toTop"
        className={showToTop ? 'show' : ''}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        ↑
      </button>
    </>
  );
}
