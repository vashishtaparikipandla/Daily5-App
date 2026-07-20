import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, CheckCircle2, ChevronLeft } from 'lucide-react';
import { PermissionPrimer } from './PermissionPrimer';
import './PhotoBackfillFlow.css';

interface PhotoBackfillFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

type FlowStep = 'offer' | 'permission' | 'select_days' | 'quick_fill' | 'reveal';

// Mock clustering data
const MOCK_DAYS = [
  { id: 'd1', date: new Date(Date.now() - 2 * 86400000), count: 8, thumb: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80' },
  { id: 'd2', date: new Date(Date.now() - 5 * 86400000), count: 14, thumb: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80' },
  { id: 'd3', date: new Date(Date.now() - 12 * 86400000), count: 5, thumb: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=400&q=80' }
];

export const PhotoBackfillFlow: React.FC<PhotoBackfillFlowProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<FlowStep>('offer');
  const [selectedDays, setSelectedDays] = useState<string[]>(MOCK_DAYS.map(d => d.id));
  const [currentFillIndex, setCurrentFillIndex] = useState(0);

  const toggleDay = (id: string) => {
    setSelectedDays(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleNextFill = () => {
    if (currentFillIndex < selectedDays.length - 1) {
      setCurrentFillIndex(prev => prev + 1);
    } else {
      setStep('reveal');
      setTimeout(() => {
        onComplete();
      }, 3500); // Wait for reveal animation then exit
    }
  };

  const currentDay = MOCK_DAYS.find(d => d.id === selectedDays[currentFillIndex]);

  return (
    <div className="backfill-container">
      <AnimatePresence mode="wait">
        
        {step === 'offer' && (
          <motion.div key="offer" className="backfill-step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="backfill-hero">
              <div className="backfill-icon-stack">
                <ImageIcon size={48} strokeWidth={1} />
              </div>
              <h1 className="backfill-title">Want a head start?</h1>
              <p className="backfill-desc">We can turn some of your existing photos into your first pages.</p>
            </div>
            <div className="backfill-actions">
              <button className="backfill-btn-primary" onClick={() => setStep('permission')}>
                Import some photos
              </button>
              <button className="backfill-btn-secondary" onClick={onSkip}>
                Start fresh
              </button>
            </div>
          </motion.div>
        )}

        {step === 'permission' && (
          <PermissionPrimer 
            key="permission"
            type="photos"
            onContinue={() => setStep('select_days')}
            onSkip={onSkip}
          />
        )}

        {step === 'select_days' && (
          <motion.div key="select" className="backfill-step select-days" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="backfill-header-nav">
              <button className="backfill-back" onClick={() => setStep('offer')}><ChevronLeft size={24} /></button>
              <h2>Select Days</h2>
              <div style={{ width: 24 }} />
            </div>
            <p className="backfill-sub">We found a few days with lots of photos. Which ones do you want to add?</p>
            
            <div className="day-list">
              {MOCK_DAYS.map(day => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <button key={day.id} className={`day-select-row ${isSelected ? 'selected' : ''}`} onClick={() => toggleDay(day.id)}>
                    <img src={day.thumb} alt="" className="day-select-thumb" />
                    <div className="day-select-info">
                      <span className="day-select-date">{day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                      <span className="day-select-count">{day.count} photos</span>
                    </div>
                    <div className="day-select-check">
                      {isSelected && <CheckCircle2 size={20} color="var(--accent)" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="backfill-actions-fixed">
              <button 
                className="backfill-btn-primary" 
                disabled={selectedDays.length === 0}
                onClick={() => setStep('quick_fill')}
              >
                Continue ({selectedDays.length})
              </button>
            </div>
          </motion.div>
        )}

        {step === 'quick_fill' && currentDay && (
          <motion.div key={`fill-${currentDay.id}`} className="backfill-step quick-fill" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="backfill-header-nav">
              <button className="backfill-back" onClick={() => {
                if (currentFillIndex > 0) setCurrentFillIndex(prev => prev - 1);
                else setStep('select_days');
              }}><ChevronLeft size={24} /></button>
              <h2>{currentDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h2>
              <button className="backfill-skip" onClick={handleNextFill}>Skip</button>
            </div>
            
            <div className="quick-fill-body">
              <div className="quick-fill-photo">
                <img src={currentDay.thumb} alt="" />
              </div>
              <textarea 
                className="quick-fill-input" 
                placeholder="What happened this day? (Add up to 5 memories)" 
                autoFocus
              />
            </div>

            <div className="backfill-actions-fixed">
              <button className="backfill-btn-primary" onClick={handleNextFill}>
                {currentFillIndex < selectedDays.length - 1 ? 'Next Day' : 'Finish'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'reveal' && (
          <motion.div key="reveal" className="backfill-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div 
              className="reveal-book"
              initial={{ scale: 0.8, rotateY: 90 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 60, damping: 20 }}
            >
              <div className="reveal-cover">
                <h3>{new Date().toLocaleDateString('en-US', { month: 'short' })}</h3>
                <span className="reveal-badge">Imported</span>
              </div>
              <div className="reveal-spine" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              Your first book is ready
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
