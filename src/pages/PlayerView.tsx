import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import Countdown from '@/components/Countdown';
import SpinningWheelAnimation from '@/components/animations/SpinningWheelAnimation';
import SlotMachineAnimation from '@/components/animations/SlotMachineAnimation';
import RouletteAnimation from '@/components/animations/RouletteAnimation';
import LotteryBallsAnimation from '@/components/animations/LotteryBallsAnimation';
import FlipCounterAnimation from '@/components/animations/FlipCounterAnimation';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface Winner {
  ticket_number: number;
  player_name: string;
}

export default function PlayerView() {
  const { code } = useParams<{ code: string }>();
  const [phase, setPhase] = useState<'waiting' | 'countdown' | 'spinning' | 'winner'>('waiting');
  const [gameName, setGameName] = useState('');
  const [maxTickets, setMaxTickets] = useState(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [wheels, setWheels] = useState<number[][]>([]);
  const [finalDigits, setFinalDigits] = useState<number[]>([]);
  const [currentDigitIndex, setCurrentDigitIndex] = useState(0);
  const [revealedDigits, setRevealedDigits] = useState<number[]>([]);
  const [animationType, setAnimationType] = useState<string>('spinning_wheel');
  const [gameId, setGameId] = useState<string>('');

  useEffect(() => {
    fetchGameData();
    subscribeToGameStatus();
  }, [code]);

  const fetchGameData = async () => {
    try {
      const { data: game, error } = await supabase
        .from('games')
        .select('id, name, max_tickets, status, created_by_user_id, profiles(animation_type)')
        .eq('code6', code)
        .single();

      if (error) throw error;
      
      setGameId(game.id);
      setGameName(game.name);
      setMaxTickets(game.max_tickets);
      
      const hostProfile = game.profiles as any;
      if (hostProfile?.animation_type) {
        setAnimationType(hostProfile.animation_type);
      }

      if (game.status === 'drawn') {
        fetchWinnerData(game.id);
      }
    } catch (error: any) {
      console.error('Error fetching game:', error);
    }
  };

  const subscribeToGameStatus = () => {
    const channel = supabase
      .channel('game-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `code6=eq.${code}`
        },
        (payload) => {
          if (payload.new.status === 'locked') {
            setPhase('countdown');
          } else if (payload.new.status === 'drawn') {
            fetchWinnerData(payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchWinnerData = async (gameId: string) => {
    try {
      const { data: draw, error } = await supabase
        .from('draws')
        .select('winner_ticket_id, audit_json')
        .eq('game_id', gameId)
        .single();

      if (error) throw error;

      const winning = (draw.audit_json as any)?.winning_number;
      if (winning) {
        setWinningNumber(winning);
        
        const { data: ticket } = await supabase
          .from('tickets')
          .select('number, players(first_name, last_name)')
          .eq('game_id', gameId)
          .eq('number', winning)
          .single();

        if (ticket) {
          const player = ticket.players as any;
          setWinner({
            ticket_number: ticket.number,
            player_name: `${player.first_name} ${player.last_name}`
          });
        }
      }

      setPhase('winner');
    } catch (error: any) {
      console.error('Error fetching winner:', error);
    }
  };

  const handleCountdownComplete = () => {
    setPhase('spinning');
    generateWheels(maxTickets);
  };

  const generateWheels = (max: number) => {
    const maxStr = max.toString();
    const numDigits = maxStr.length;
    const wheelsData: number[][] = [];

    for (let i = 0; i < numDigits; i++) {
      const maxDigit = parseInt(maxStr[i]);
      wheelsData.push([maxDigit]);
    }

    setWheels(wheelsData);

    if (winningNumber) {
      setFinalDigits(winningNumber.toString().padStart(numDigits, '0').split('').map(Number));
    }
  };

  const handleWheelComplete = () => {
    setRevealedDigits(prev => [...prev, finalDigits[currentDigitIndex]]);
    
    if (currentDigitIndex < finalDigits.length - 1) {
      setCurrentDigitIndex(prev => prev + 1);
    } else {
      setTimeout(() => {
        setPhase('winner');
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center bg-gradient-to-br from-background to-secondary">
      <div className="max-w-6xl w-full">
        <Card className="p-12 glass text-center">
          <h1 className="text-5xl font-bold gradient-text mb-8">{gameName}</h1>

          {phase === 'waiting' && (
            <div className="space-y-4">
              <p className="text-2xl text-muted-foreground">
                Waiting for the draw to begin...
              </p>
            </div>
          )}

          {phase === 'countdown' && (
            <Countdown onComplete={handleCountdownComplete} />
          )}

          {phase === 'spinning' && (
            <div className="space-y-8">
              <h2 className="text-4xl font-bold gradient-text mb-8">
                Drawing Winning Number...
              </h2>
              <div className="flex justify-center">
                {currentDigitIndex < wheels.length && (
                  <>
                    {animationType === 'spinning_wheel' && (
                      <SpinningWheelAnimation
                        maxDigit={wheels[currentDigitIndex][0]}
                        finalDigit={finalDigits[currentDigitIndex]}
                        onComplete={handleWheelComplete}
                        isActive={true}
                      />
                    )}
                    {animationType === 'slot_machine' && (
                      <SlotMachineAnimation
                        maxDigit={wheels[currentDigitIndex][0]}
                        finalDigit={finalDigits[currentDigitIndex]}
                        onComplete={handleWheelComplete}
                        isActive={true}
                      />
                    )}
                    {animationType === 'roulette' && (
                      <RouletteAnimation
                        maxDigit={wheels[currentDigitIndex][0]}
                        finalDigit={finalDigits[currentDigitIndex]}
                        onComplete={handleWheelComplete}
                        isActive={true}
                      />
                    )}
                    {animationType === 'lottery_balls' && (
                      <LotteryBallsAnimation
                        maxDigit={wheels[currentDigitIndex][0]}
                        finalDigit={finalDigits[currentDigitIndex]}
                        onComplete={handleWheelComplete}
                        isActive={true}
                      />
                    )}
                    {animationType === 'flip_counter' && (
                      <FlipCounterAnimation
                        maxDigit={wheels[currentDigitIndex][0]}
                        finalDigit={finalDigits[currentDigitIndex]}
                        onComplete={handleWheelComplete}
                        isActive={true}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-8">
                {finalDigits.map((digit, index) => (
                  <div
                    key={index}
                    className={`w-20 h-24 border-2 border-primary rounded-lg flex items-center justify-center text-4xl font-bold ${
                      index < revealedDigits.length ? 'gradient-text' : 'text-muted-foreground'
                    }`}
                  >
                    {index < revealedDigits.length ? revealedDigits[index] : '?'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === 'winner' && winner && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <Trophy className="h-32 w-32 mx-auto text-primary animate-pulse-glow" />
              <h2 className="text-6xl font-bold gradient-text mb-4">
                We Have a Winner!
              </h2>
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-8 rounded-xl">
                <p className="text-2xl text-muted-foreground mb-2">Winning Ticket</p>
                <p className="text-7xl font-bold gradient-text mb-6">{winner.ticket_number}</p>
                <p className="text-3xl font-semibold">{winner.player_name}</p>
              </div>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
