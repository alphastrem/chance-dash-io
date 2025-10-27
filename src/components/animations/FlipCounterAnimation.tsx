import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipCounterAnimationProps {
  maxDigit: number;
  finalDigit: number;
  onComplete: () => void;
  isActive: boolean;
}

export default function FlipCounterAnimation({ maxDigit, finalDigit, onComplete, isActive }: FlipCounterAnimationProps) {
  const [displayNumber, setDisplayNumber] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    setIsFlipping(true);
    let counter = 0;
    
    const flipInterval = setInterval(() => {
      counter++;
      setDisplayNumber(counter % (maxDigit + 1));
    }, 100);

    setTimeout(() => {
      clearInterval(flipInterval);
      setDisplayNumber(finalDigit);
      setIsFlipping(false);
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearInterval(flipInterval);
  }, [isActive, maxDigit, finalDigit, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-48 h-64 border-4 border-primary rounded-xl glass overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
          
          <div className="relative h-full flex items-center justify-center perspective-1000">
            <AnimatePresence mode="wait">
              <motion.div
                key={displayNumber}
                initial={{ rotateX: 90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-8xl font-bold gradient-text"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {displayNumber}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 h-1 bg-primary/50 blur-sm" />
      </div>
    </div>
  );
}
