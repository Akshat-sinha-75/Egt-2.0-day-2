import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';

export default function Footer() {
  const [showToTop, setShowToTop] = useState(false);
  const [embers, setEmbers] = useState([]);

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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSocialHover = (e, color = '#f0d089') => {
    const r = e.currentTarget.getBoundingClientRect();
    spawnSparks(r.left + r.width / 2, r.top + r.height / 2, color, 6);
  };

  const scrollToTop = () => {
    if (window.lenis) {
      window.lenis.scrollTo(0, { duration: 1.4 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
          {/* Column 1: Brand & Identity */}
          <div className="f-brand reveal">
            <img
              src="/assets/logo.png"
              alt="Alexa Developers CU Logo"
              className="footer-logo-img"
            />
            <p className="f-name">ALEXA DEVELOPERS CU</p>
            <p className="f-ed">EGT 2.0 · WIZARDING EDITION</p>
            <p className="f-desc">
              Where ideas transform into magic. The premier student developer community driving technical innovation, buildathons, and tournaments at Chandigarh University.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <nav className="f-col reveal" aria-label="Footer Navigation">
            <h4>EXPLORE</h4>
            <div className="f-nav">
              <a href="#hero">THE DUEL</a>
              <a href="#exams">O.W.L. EXAMS</a>
              <a href="#buildathon">THE GRAND HALL</a>
            </div>
          </nav>

          {/* Column 3: Socials & Connect */}
          <div className="f-col f-right reveal">
            <h4>OWL POST &amp; SOCIAL</h4>
            <div className="socials">
              {/* Instagram */}
              <a
                className="soc"
                href="https://www.instagram.com/alexadev.cu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @alexadev.cu"
                title="Instagram"
                onPointerEnter={(e) => handleSocialHover(e, '#e1306c')}
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

              {/* LinkedIn */}
              <a
                className="soc"
                href="https://www.linkedin.com/company/alexadevscu/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Alexa Developers CU"
                title="LinkedIn"
                onPointerEnter={(e) => handleSocialHover(e, '#0077b5')}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4.5 9.5v11M4.5 4.6v.1M10 20.5v-7c0-2.2 1.6-4 3.9-4s4.1 1.8 4.1 4v7" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                className="soc"
                href="https://chat.whatsapp.com/GQScMwZ7X6EKAjfqAFkz4q"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Community"
                title="WhatsApp Community"
                onPointerEnter={(e) => handleSocialHover(e, '#25d366')}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" />
                  <path d="M8.8 8.8c-.3.3-.4 1 0 1.9.6 1.4 1.9 2.9 3.9 3.9 1 .5 1.8.5 2.2.2l.8-1-1.9-1.2-.8.7c-1-.5-1.9-1.4-2.4-2.4l.7-.8-1.2-1.9Z" />
                </svg>
              </a>

              {/* Official Website */}
              <a
                className="soc"
                href="https://alexa-developers-at-cu.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Alexa Developers CU Official Website"
                title="Official Website"
                onPointerEnter={(e) => handleSocialHover(e, '#f0d089')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
            </div>

            <a
              className="contact-btn"
              href="https://alexa-developers-at-cu.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              VISIT OFFICIAL PORTAL ↗
            </a>
          </div>

          {/* Column 4: Community & Organization */}
          <div className="f-col f-community reveal">
            <h4 className="it">COMMUNITY</h4>
            <p>
              <b>Alexa Developers CU</b>
              <br />
              Chandigarh University · Punjab
              <br />
              <a
                href="https://chat.whatsapp.com/GQScMwZ7X6EKAjfqAFkz4q"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--gold-bright)', textDecoration: 'underline' }}
              >
                Join WhatsApp Network ↗
              </a>
              <br />
              <span className="mm">“Mischief Managed · Build With Magic”</span>
            </p>
          </div>
        </div>

        <div className="foot-end">
          <p className="fe-name">ALEXA DEVELOPERS CU</p>
          <p className="fe-ed">· EGT 2.0 · WIZARDING EDITION ·</p>
          <p className="fe-magic">Crafted with magic, code &amp; innovation.</p>
        </div>

        <div className="foot-bottom">
          <p>© 2026 Alexa Developers CU · EGT 2.0 · ALL ENCHANTMENTS RESERVED</p>
        </div>
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
