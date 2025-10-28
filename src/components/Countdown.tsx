import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CountdownProps {
  onComplete: () => void;
}

export default function Countdown({ onComplete }: CountdownProps) {
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="flex flex-col items-center gap-8">
      <motion.div
        key={count}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary to-accent opacity-50 animate-pulse-glow" />
        <span className="text-9xl font-bold gradient-text relative z-10">
          {count}
        </span>
      </motion.div>
      <p className="text-2xl text-muted-foreground">Get ready for the draw...</p>
    </div>
  );
}
