import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface RouletteAnimationProps {
  maxDigit: number;
  finalDigit: number;
  onComplete: () => void;
  isActive: boolean;
}

export default function RouletteAnimation({ maxDigit, finalDigit, onComplete, isActive }: RouletteAnimationProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const numbers = Array.from({ length: maxDigit + 1 }, (_, i) => i);

  useEffect(() => {
    if (!isActive) return;

    setIsSpinning(true);

    setTimeout(() => {
      setIsSpinning(false);
      setTimeout(onComplete, 500);
    }, 3000);
  }, [isActive, onComplete]);

  const anglePerNumber = 360 / numbers.length;
  const finalAngle = -(finalDigit * anglePerNumber) + 720 * 3; // 3 full rotations plus final position

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-64 h-64">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-primary" />
        </div>
        
        {/* Roulette wheel */}
        <motion.div
          className="relative w-full h-full rounded-full border-8 border-primary glass flex items-center justify-center"
          animate={isSpinning ? {
            rotate: finalAngle
          } : {}}
          transition={{
            duration: 3,
            ease: "easeOut"
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
          
          {numbers.map((num, idx) => {
            const angle = idx * anglePerNumber;
            const radius = 80;
            const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
            const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
            
            return (
              <div
                key={num}
                className="absolute"
                style={{
                  transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`
                }}
              >
                <span className="text-3xl font-bold gradient-text">{num}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
