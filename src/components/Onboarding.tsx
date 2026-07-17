import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Onboarding.css';

const SLIDES = [
  {
    title: 'Life is short.',
    body: 'The moments that matter most are the ones you almost forgot.',
    visual: 'lamp',
  },
  {
    title: 'Every night,\nchoose 5.',
    body: 'Not because the rest don\'t count — but because some things deserve to be remembered.',
    visual: 'dots',
  },
  {
    title: 'Not just\nthe good days.',
    body: 'Hard days, small victories, twisted ankles. Every moment belongs.',
    visual: 'icons',
  },
  {
    title: 'Every month\nbecomes a book.',
    body: 'A real, physical record you can hold, share, or print.',
    visual: 'book',
  },
];

const MIXED_ICONS = ['☕', '🩹', '❤️', '🌧️', '✈️', '📖'];
const DOT_COUNT = 5;

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (n: number) => {
    setDirection(n > slide ? 1 : -1);
    setSlide(n);
  };

  const next = () => {
    if (slide < SLIDES.length - 1) go(slide + 1);
    else onDone();
  };

  const s = SLIDES[slide];

  return (
    <motion.div
      className="onboard-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Skip */}
      <button className="onboard-skip" onClick={onDone}>Skip</button>

      {/* Visual area */}
      <div className="onboard-visual">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide}
            className="visual-inner"
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {s.visual === 'lamp' && (
              <div className="visual-lamp">
                <div className="lamp-glow" />
                <span className="lamp-icon">🪔</span>
              </div>
            )}
            {s.visual === 'dots' && (
              <div className="visual-dots">
                {Array.from({ length: DOT_COUNT }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="ob-dot"
                    animate={{ scale: [0.6, 1, 0.6], opacity: [0.3, 1, 0.3] }}
                    transition={{ delay: i * 0.3, duration: 1.5, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
            {s.visual === 'icons' && (
              <div className="visual-icons">
                {MIXED_ICONS.map((icon, i) => (
                  <motion.div
                    key={i}
                    className="ob-icon-chip"
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.25 }}
                  >
                    <span>{icon}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {s.visual === 'book' && (
              <div className="visual-book-wrap">
                <motion.div
                  className="ob-book"
                  animate={{ rotateY: [0, -15, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformStyle: 'preserve-3d', perspective: 400 }}
                >
                  <div className="ob-book-cover">
                    <span className="ob-book-month">July 2026</span>
                    <div className="ob-book-pattern">
                      {['☕','✈️','❤️','📖'].map((e, i) => (
                        <span key={i} className="ob-book-icon">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="ob-book-spine" />
                  <div className="ob-book-pages" />
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Text area */}
      <div className="onboard-text">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide}
            custom={direction}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <h1 className="ob-title" style={{ whiteSpace: 'pre-line' }}>{s.title}</h1>
            <p className="ob-body">{s.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress + CTA */}
      <div className="onboard-footer">
        <div className="ob-dots">
          {SLIDES.map((_, i) => (
            <button key={i} className={`ob-pip ${i === slide ? 'active' : ''}`} onClick={() => go(i)} />
          ))}
        </div>
        <motion.button
          className="ob-cta"
          onClick={next}
          whileTap={{ scale: 0.96 }}
        >
          {slide < SLIDES.length - 1 ? 'Next' : 'Get Started'}
        </motion.button>
      </div>
    </motion.div>
  );
}
