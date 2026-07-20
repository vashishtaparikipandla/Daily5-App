import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Share, Copy, Gift } from 'lucide-react';
import './ReferralOverlay.css';

interface ReferralOverlayProps {
  onClose: () => void;
}

export const ReferralOverlay: React.FC<ReferralOverlayProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const link = 'daily5.co/r/vashishta';

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Daily 5',
        text: 'Join me on Daily 5 and get your first printed book free!',
        url: 'https://' + link,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div 
      className="referral-overlay"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
    >
      <div className="referral-header">
        <button className="referral-close" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <div className="referral-content">
        <div className="referral-hero">
          <div className="referral-icon-stack">
            <Gift size={48} strokeWidth={1} color="var(--accent)" />
          </div>
          <h1 className="referral-title">Give a book, get a book</h1>
          <p className="referral-desc">
            Your friend gets their first printed book for free. When they print it, your next month's book is on us.
          </p>
        </div>

        <div className="referral-share-box">
          <p className="referral-share-label">Your unique link</p>
          <div className="referral-link-row">
            <div className="referral-link">{link}</div>
            <button className="referral-copy-btn" onClick={handleCopy}>
              {copied ? 'Copied!' : <Copy size={20} />}
            </button>
          </div>
        </div>

        <button className="referral-btn-primary" onClick={handleShare}>
          <Share size={20} />
          Share Link
        </button>
      </div>
    </motion.div>
  );
};
