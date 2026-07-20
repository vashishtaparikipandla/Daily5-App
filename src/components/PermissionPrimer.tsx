import React from 'react';
import { motion } from 'framer-motion';
import { Image, Camera, Bell, Contact } from 'lucide-react';
import './PermissionPrimer.css';

export type PermissionType = 'photos' | 'camera' | 'notifications' | 'contacts';

interface PermissionPrimerProps {
  type: PermissionType;
  onContinue: () => void;
  onSkip: () => void;
}

const config = {
  photos: {
    icon: Image,
    text: "We'll ask to access your photos so you can add them to a moment."
  },
  camera: {
    icon: Camera,
    text: "We'll ask for camera access so you can snap a moment right now."
  },
  notifications: {
    icon: Bell,
    text: "Want a gentle nudge before bed to log tonight's 5?"
  },
  contacts: {
    icon: Contact,
    text: "We'll ask for contacts access so you can quickly invite a friend."
  }
};

export const PermissionPrimer: React.FC<PermissionPrimerProps> = ({ type, onContinue, onSkip }) => {
  const { icon: Icon, text } = config[type];

  return (
    <motion.div 
      className="permission-primer-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="permission-primer-card"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="primer-icon-wrap">
          <Icon size={32} strokeWidth={1.5} color="var(--accent-dark)" />
        </div>
        <p className="primer-text">{text}</p>
        
        <div className="primer-actions">
          <button className="primer-btn-primary" onClick={onContinue}>
            Continue
          </button>
          <button className="primer-btn-secondary" onClick={onSkip}>
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
