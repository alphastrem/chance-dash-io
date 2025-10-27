import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SlotMachineAnimationProps {
  maxDigit: number;
  finalDigit: number;
  onComplete: () => void;
  isActive: boolean;
}

export default function SlotMachineAnimation({ maxDigit, finalDigit, onComplete, isActive }: SlotMachineAnimationProps) {
  const [displayNumbers, setDisplayNumbers] = useState<number[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    setIsSpinning(true);
    
    // Create array of all possible numbers repeated for smooth scrolling
    const numbers = Array.from({ length: (maxDigit + 1) * 8 }, (_, i) => i % (maxDigit + 1));
    setDisplayNumbers(numbers);

    // Stop spinning after 3 seconds
    setTimeout(() => {
      setIsSpinning(false);
      setTimeout(onComplete, 500);
    }, 3000);
  }, [isActive, maxDigit, finalDigit, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-64 border-4 border-primary rounded-xl glass overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
        <div className="relative h-full flex items-center justify-center overflow-hidden">
          <motion.div
            className="flex flex-col items-center"
            animate={isSpinning ? {
              y: [0, -64 * displayNumbers.length + 192]
            } : {
              y: -64 * (displayNumbers.length - displayNumbers.indexOf(finalDigit) - 4)
            }}
            transition={isSpinning ? {
              duration: 3,
              ease: "linear",
              repeat: 0
            } : {
              duration: 0.5,
              ease: "easeOut"
            }}
          >
            {displayNumbers.map((num, idx) => (
              <div key={idx} className="h-16 flex items-center justify-center">
                <span className="text-6xl font-bold gradient-text">{num}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
