import { motion } from 'framer-motion';
import './Splash.css';

export function Splash() {
  return (
    <motion.div
      className="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Paper grain texture overlay */}
      <div className="splash-texture" />

      <div className="splash-inner">
        <motion.div
          className="splash-logo-group"
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Animated page corner glyph */}
          <motion.div
            className="splash-corner-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="splash-corner"
              animate={{
                rotateZ: [0, 45, 0],
                scale:   [1, 1.2, 1],
              }}
              transition={{
                duration: 1.0,
                delay: 0.5,
                ease: 'easeInOut',
                times: [0, 0.4, 1],
              }}
            />
          </motion.div>

          <h1 className="splash-wordmark">Daily 5</h1>
        </motion.div>

        <motion.p
          className="splash-tagline"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.65, duration: 0.35 }}
        >
          your days, remembered
        </motion.p>
      </div>

      {/* Loading pulse dot */}
      <motion.div
        className="splash-pulse"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 1.0, duration: 0.9, repeat: Infinity }}
      />
    </motion.div>
  );
}
