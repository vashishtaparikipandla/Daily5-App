import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Plane, Heart, BookOpen, Activity, Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react';
import './Onboarding.css';

const SLIDES = [
  {
    title: 'Life is short.',
    body: "The moments that matter most are the ones you almost forgot.",
    visual: 'lamp',
  },
  {
    title: 'Every night,\nchoose 5.',
    body: "Not because the rest don't count — but because some things deserve to be remembered.",
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

const MIXED_ICONS = [
  { Icon: Coffee,   color: '#C47B3A', label: 'Coffee' },
  { Icon: Activity, color: '#E8593A', label: 'Health' },
  { Icon: Heart,    color: '#E83A7A', label: 'Love'   },
  { Icon: Plane,    color: '#3A7EC4', label: 'Travel' },
  { Icon: BookOpen, color: '#C43A6F', label: 'Learn'  },
];
const BOOK_COVER_ICONS = [Coffee, Plane, Heart, BookOpen] as const;
const DOT_COUNT = 5;

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  // 0: DOB, 1: Self-assess, 2: Reveal, 3: Carousel
  const [phase, setPhase] = useState(0); 
  
  // Phase 0: DOB
  const [dob, setDob] = useState('1990-01-01');

  // Phase 1: Self-assessment
  const [rememberedDays, setRememberedDays] = useState<number | null>(null);

  // Phase 3: Carousel
  const [slideIdx, setSlideIdx] = useState(0);
  const [direction, setDir]     = useState(1);

  const WEEKS_IN_LIFE = 4160; // 80 years
  const livedWeeks = useMemo(() => {
    const birth = new Date(dob);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return Math.min(Math.floor(diffDays / 7), WEEKS_IN_LIFE);
  }, [dob]);

  const goCarousel = (n: number) => {
    setDir(n > slideIdx ? 1 : -1);
    setSlideIdx(n);
  };

  const nextCarousel = () => {
    if (slideIdx < SLIDES.length - 1) goCarousel(slideIdx + 1);
    else onDone();
  };

  const renderPhase0 = () => (
    <motion.div key="phase0" className="pre-ob-screen" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <h2 className="pre-ob-title">When were you born?</h2>
      <p className="pre-ob-sub">We'll use this to show you something.</p>
      <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="pre-ob-date" />
      <button className="pre-ob-btn" onClick={() => setPhase(1)}>Continue <ChevronRight size={18} /></button>
    </motion.div>
  );

  const renderPhase1 = () => (
    <motion.div key="phase1" className="pre-ob-screen" initial={{opacity:0, x: 20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}}>
      <button className="pre-ob-back" onClick={() => setPhase(0)}><ChevronLeft size={20} /></button>
      <h2 className="pre-ob-title">How many days from last week can you actually remember clearly?</h2>
      <div className="pre-ob-scale">
        {[0,1,2,3,4,5,6,7].map(num => (
          <button 
            key={num} 
            className={`scale-btn ${rememberedDays === num ? 'active' : ''}`}
            onClick={() => setRememberedDays(num)}
          >
            {num}
          </button>
        ))}
      </div>
      {rememberedDays !== null && (
        <motion.p initial={{opacity:0, y: 10}} animate={{opacity:1, y:0}} className="pre-ob-reflection">
          {rememberedDays <= 3 ? "That's normal. Most people can't." : "That's great, but it's hard to keep up."}
        </motion.p>
      )}
      <button className="pre-ob-btn" onClick={() => setPhase(2)} disabled={rememberedDays === null}>
        Show me <ChevronRight size={18} />
      </button>
    </motion.div>
  );

  const renderPhase2 = () => (
    <motion.div key="phase2" className="pre-ob-screen pre-ob-reveal" initial={{opacity:0}} animate={{opacity:1, transition: {duration: 1}}} exit={{opacity:0}}>
      <div className="reveal-dots-container">
        <div className="reveal-dots-grid">
          {Array.from({length: WEEKS_IN_LIFE}).map((_, i) => (
            <div key={i} className={`reveal-dot ${i < livedWeeks ? 'lived' : ''}`} />
          ))}
        </div>
      </div>
      <div className="reveal-overlay">
        <motion.h2 className="reveal-title" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 1.5}}>
          An 80-year life has {WEEKS_IN_LIFE} weeks.
        </motion.h2>
        <motion.p className="reveal-sub" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 3}}>
          You've already lived {livedWeeks}.
        </motion.p>
        <motion.p className="reveal-sub" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 4.5}}>
          How many of them do you remember?
        </motion.p>
        <motion.button className="pre-ob-btn" initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 6}} onClick={() => setPhase(3)}>
          Enter Daily 5 <ChevronRight size={18} />
        </motion.button>
      </div>
    </motion.div>
  );

  const renderPhase3 = () => {
    const s = SLIDES[slideIdx];
    return (
      <motion.div key="phase3" className="onboard-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <button className="onboard-skip" onClick={onDone}>Skip</button>

        {/* Visual zone */}
        <div className="onboard-visual">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slideIdx}
              className="visual-inner"
              custom={direction}
              initial={{ x: direction * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -60, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Slide 1: Glowing lamp */}
              {s.visual === 'lamp' && (
                <div className="visual-lamp">
                  <div className="lamp-glow" />
                  <motion.div
                    className="lamp-icon-wrap"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Lightbulb
                      size={80}
                      strokeWidth={1.25}
                      style={{ color: 'var(--accent)', filter: 'drop-shadow(0 8px 24px rgba(232,89,58,0.4))' }}
                    />
                  </motion.div>
                </div>
              )}

              {/* Slide 2: Pulsing dots */}
              {s.visual === 'dots' && (
                <div className="visual-dots">
                  {Array.from({ length: DOT_COUNT }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="ob-dot"
                      animate={{ scale: [0.6, 1, 0.6], opacity: [0.35, 1, 0.35] }}
                      transition={{ delay: i * 0.28, duration: 1.4, repeat: Infinity }}
                    />
                  ))}
                </div>
              )}

              {/* Slide 3: Category icons */}
              {s.visual === 'icons' && (
                <div className="visual-icons">
                  {MIXED_ICONS.map(({ Icon, color, label }, i) => (
                    <motion.div
                      key={label}
                      className="ob-icon-chip"
                      initial={{ x: -24, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.09, duration: 0.22 }}
                      style={{ borderColor: color + '44', background: color + '18' }}
                    >
                      <Icon size={26} strokeWidth={1.5} style={{ color }} />
                      <span className="ob-chip-label" style={{ color }}>{label}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Slide 4: 3D book */}
              {s.visual === 'book' && (
                <div className="visual-book-wrap">
                  <motion.div
                    className="ob-book"
                    animate={{ rotateY: [0, -18, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformStyle: 'preserve-3d', perspective: 400 }}
                  >
                    <div className="ob-book-cover">
                      <span className="ob-book-month">July 2026</span>
                      <div className="ob-book-pattern">
                        {BOOK_COVER_ICONS.map((Icon, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 + i * 0.09, type: 'spring', stiffness: 300, damping: 14 }}
                          >
                            <Icon size={18} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />
                          </motion.div>
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

        {/* Text */}
        <div className="onboard-text">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slideIdx}
              custom={direction}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            >
              <h1 className="ob-title" style={{ whiteSpace: 'pre-line' }}>{s.title}</h1>
              <p className="ob-body">{s.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="onboard-footer">
          <div className="ob-dots">
            {SLIDES.map((_, i) => (
              <button key={i} className={`ob-pip ${i === slideIdx ? 'active' : ''}`} onClick={() => goCarousel(i)} />
            ))}
          </div>
          <motion.button className="ob-cta" onClick={nextCarousel} whileTap={{ scale: 0.96 }}>
            {slideIdx < SLIDES.length - 1 ? 'Next' : 'Get Started'}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {phase === 0 && renderPhase0()}
      {phase === 1 && renderPhase1()}
      {phase === 2 && renderPhase2()}
      {phase === 3 && renderPhase3()}
    </AnimatePresence>
  );
}
