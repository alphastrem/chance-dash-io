import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LotteryBallsAnimationProps {
  maxDigit: number;
  finalDigit: number;
  onComplete: () => void;
  isActive: boolean;
}

export default function LotteryBallsAnimation({ maxDigit, finalDigit, onComplete, isActive }: LotteryBallsAnimationProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedBall, setSelectedBall] = useState<number | null>(null);
  const numbers = Array.from({ length: maxDigit + 1 }, (_, i) => i);

  useEffect(() => {
    if (!isActive) return;

    setIsSpinning(true);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedBall(finalDigit);
      setTimeout(onComplete, 1000);
    }, 3000);
  }, [isActive, finalDigit, onComplete]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-96 h-64 border-4 border-primary rounded-xl glass overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
        
        <div className="relative h-full p-4 flex flex-wrap gap-3 items-center justify-center">
          {numbers.map((num) => (
            <motion.div
              key={num}
              className={`w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center ${
                selectedBall === num ? 'bg-primary' : 'bg-background'
              }`}
              animate={isSpinning ? {
                y: [0, -100, 0],
                x: [0, Math.random() * 40 - 20, 0],
                scale: selectedBall === num ? 1.5 : 1
              } : {
                scale: selectedBall === num ? 1.5 : 1
              }}
              transition={{
                duration: 0.8,
                repeat: isSpinning ? Infinity : 0,
                delay: num * 0.1
              }}
            >
              <span className={`text-2xl font-bold ${
                selectedBall === num ? 'text-primary-foreground' : 'gradient-text'
              }`}>
                {num}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      
      {selectedBall !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold gradient-text"
        >
          Selected: {selectedBall}
        </motion.div>
      )}
    </div>
  );
}
