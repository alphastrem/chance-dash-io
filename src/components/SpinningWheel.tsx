import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SpinningWheelProps {
  numbers: number[];
  finalNumber: number;
  onSpinComplete: () => void;
  delay: number;
}

export default function SpinningWheel({ numbers, finalNumber, onSpinComplete, delay }: SpinningWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState(numbers[0]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSpinning(true);
      
      // Rapid number changes during spin
      const spinInterval = setInterval(() => {
        setDisplayNumber(numbers[Math.floor(Math.random() * numbers.length)]);
      }, 50);

      // Stop spinning after 5 seconds
      setTimeout(() => {
        clearInterval(spinInterval);
        setDisplayNumber(finalNumber);
        setIsSpinning(false);
        setTimeout(onSpinComplete, 300);
      }, 5000);
    }, delay);

    return () => clearTimeout(timer);
  }, [numbers, finalNumber, onSpinComplete, delay]);

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
