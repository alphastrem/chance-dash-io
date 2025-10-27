import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SpinningWheelAnimationProps {
  maxDigit: number;
  finalDigit: number;
  onComplete: () => void;
  isActive: boolean;
}

export default function SpinningWheelAnimation({ maxDigit, finalDigit, onComplete, isActive }: SpinningWheelAnimationProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    setIsSpinning(true);
    
    // Rapid number changes - cycle through all possible digits
    const spinInterval = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * (maxDigit + 1)));
    }, 50);

    // Stop spinning after 3 seconds
    setTimeout(() => {
      clearInterval(spinInterval);
      setDisplayNumber(finalDigit);
      setIsSpinning(false);
      setTimeout(onComplete, 300);
    }, 3000);

    return () => clearInterval(spinInterval);
  }, [isActive, maxDigit, finalDigit, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className="relative w-48 h-48 rounded-full border-4 border-primary flex items-center justify-center glass"
        animate={isSpinning ? {
          rotate: 360,
          scale: [1, 1.1, 1],
        } : {}}
        transition={isSpinning ? {
          rotate: { duration: 0.5, repeat: Infinity, ease: "linear" },
          scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
        } : {}}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
        <motion.span
          className="text-8xl font-bold gradient-text relative z-10"
          animate={isSpinning ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
          transition={isSpinning ? { duration: 0.3, repeat: Infinity } : {}}
        >
          {displayNumber}
        </motion.span>
      </motion.div>
    </div>
  );
}
