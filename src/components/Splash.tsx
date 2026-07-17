import { motion } from 'framer-motion';
import './Splash.css';

export function Splash() {
  return (
    <motion.div
      className="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="splash-inner">
        <motion.div
          className="splash-wordmark"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
        >
          <span className="splash-title">Daily&nbsp;5</span>
          <motion.div
            className="splash-corner"
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: [0, 45, 0], opacity: [0, 1, 1] }}
            transition={{ delay: 0.4, duration: 1.2, ease: 'easeInOut', times: [0, 0.3, 1] }}
          />
        </motion.div>
        <motion.p
          className="splash-tagline"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          your days, remembered
        </motion.p>
      </div>
    </motion.div>
  );
}
