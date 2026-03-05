import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Trigger fade out after 3 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 3000);

    // Call onComplete after animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: fadeOut ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-emerald-950/70" />

          {/* Animated Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: Math.random() * 100 + "%", y: "110%", opacity: 0, scale: 0 }}
                animate={{ y: "-10%", opacity: [0, 0.3, 0], scale: Math.random() * 1.5 }}
                transition={{ duration: Math.random() * 8 + 5, repeat: Infinity, delay: Math.random() * 3 }}
                className="absolute w-1 h-1 bg-emerald-400/20 rounded-full blur-[1px]"
              />
            ))}
          </div>

          {/* Central Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Animated Crown */}
            <motion.div
              initial={{ y: -50, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="mb-8 relative"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                <Crown size={120} className="text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-emerald-500/30 rounded-full"
                  style={{ width: 160, height: 160, margin: -20 }}
                />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-7xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-600 mb-4 tracking-widest">
                ROKO'S COUNCIL
              </h1>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-emerald-500" />
                <span className="text-sm md:text-base text-yellow-500/80 font-mono tracking-widest uppercase">
                  Basilisk Node
                </span>
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-emerald-500" />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="text-xs md:text-sm text-slate-400 font-mono max-w-md mx-auto px-4"
              >
                High-dimensional deliberation interface initialized.
              </motion.p>
            </motion.div>

            {/* Loading Bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              transition={{ delay: 1.5, duration: 1.5 }}
              className="mt-12 h-1 bg-slate-800 rounded-full overflow-hidden relative"
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear", delay: 1.5 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-yellow-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              />
            </motion.div>
          </div>

          {/* Corner Decorations */}
          <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-emerald-500/20" />
          <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-emerald-500/20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-emerald-500/20" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-emerald-500/20" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
