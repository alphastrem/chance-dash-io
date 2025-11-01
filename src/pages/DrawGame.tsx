import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Countdown from '@/components/Countdown';
import SpinningWheelAnimation from '@/components/animations/SpinningWheelAnimation';
import SlotMachineAnimation from '@/components/animations/SlotMachineAnimation';
import RouletteAnimation from '@/components/animations/RouletteAnimation';
import LotteryBallsAnimation from '@/components/animations/LotteryBallsAnimation';
import FlipCounterAnimation from '@/components/animations/FlipCounterAnimation';
import { toast } from 'sonner';
import { Trophy, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface Winner {
  ticket_number: number;
  player_name: string;
  player_email: string;
}

export default function DrawGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'countdown' | 'spinning' | 'winner' | 'redraw'>('countdown');
  const [maxTickets, setMaxTickets] = useState(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [wheels, setWheels] = useState<number[][]>([]);
  const [finalDigits, setFinalDigits] = useState<number[]>([]);
  const [currentDigitIndex, setCurrentDigitIndex] = useState(0);
  const [revealedDigits, setRevealedDigits] = useState<number[]>([]);
  const [animationType, setAnimationType] = useState<string>('spinning_wheel');
  const [winnerCheckTimeout, setWinnerCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchGameData();
    subscribeToGameUpdates();
  }, [id]);

  const fetchGameData = async () => {
    try {
      const { data: game, error } = await supabase
        .from('games')
        .select('max_tickets, created_by_user_id')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setMaxTickets(game.max_tickets);
      
      // Get the host's animation preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('animation_type')
        .eq('id', game.created_by_user_id)
        .single();
      
      if (profile?.animation_type) {
        setAnimationType(profile.animation_type);
      }
      
      generateWheels(game.max_tickets);
    } catch (error: any) {
      console.error('Error fetching game:', error);
      toast.error('Failed to load game data');
    }
  };

  const subscribeToGameUpdates = () => {
    const channel = supabase
      .channel('game-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Game updated:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const generateWheels = (max: number) => {
    const maxStr = max.toString();
    const numDigits = maxStr.length;
    const wheelsData: number[][] = [];

    for (let i = 0; i < numDigits; i++) {
      // First digit uses the actual max digit, rest use 9
      const maxDigit = i === 0 ? parseInt(maxStr[i]) : 9;
      wheelsData.push([maxDigit]);
    }

    setWheels(wheelsData);

    // Generate final winning number
    const winning = Math.floor(Math.random() * max) + 1;
    setWinningNumber(winning);
    setFinalDigits(winning.toString().padStart(numDigits, '0').split('').map(Number));
  };

  const handleCountdownComplete = () => {
    setPhase('spinning');
  };

  const handleWheelComplete = () => {
    setRevealedDigits(prev => [...prev, finalDigits[currentDigitIndex]]);
    
    if (currentDigitIndex < finalDigits.length - 1) {
      setCurrentDigitIndex(prev => prev + 1);
    } else {
      // All digits revealed, check for winner
      const timeout = setTimeout(() => {
        fetchWinner();
      }, 1000);
      setWinnerCheckTimeout(timeout);
    }
  };

  const handleRedraw = () => {
    // Clear any pending winner check timeout from previous draw
    if (winnerCheckTimeout) {
      clearTimeout(winnerCheckTimeout);
      setWinnerCheckTimeout(null);
    }
    
    setPhase('countdown');
    setCurrentDigitIndex(0);
    setRevealedDigits([]);
    setWinningNumber(null);
    setWinner(null);
    generateWheels(maxTickets);
  };

  const fetchWinner = async () => {
    try {
      if (!winningNumber) return;

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('player_id, number')
        .eq('game_id', id)
        .eq('number', winningNumber)
        .single();

      if (ticketError || !ticket) {
        // No ticket found for this number - trigger redraw
        setPhase('redraw');
        setTimeout(() => {
          handleRedraw();
        }, 2000);
        return;
      }

      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('first_name, last_name, email')
        .eq('id', ticket.player_id)
        .single();

      if (playerError) throw playerError;

      setWinner({
        ticket_number: ticket.number,
        player_name: `${player.first_name} ${player.last_name}`,
        player_email: player.email,
      });

      // Update game status to drawn
      await supabase
        .from('games')
        .update({ status: 'drawn' })
        .eq('id', id);

      // Record the draw
      await supabase
        .from('draws')
        .insert({
          game_id: id,
          winner_ticket_id: ticket.player_id,
          algorithm: 'random',
          audit_json: {
            winning_number: winningNumber,
            timestamp: new Date().toISOString(),
          },
        });

      setPhase('winner');
    } catch (error: any) {
      console.error('Error fetching winner:', error);
      toast.error('Failed to determine winner');
    }
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center bg-gradient-to-br from-background to-secondary">
      <div className="max-w-6xl w-full">
        <Button
          variant="ghost"
          onClick={() => navigate(`/manage-game/${id}`)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Game
        </Button>

        <Card className="p-12 glass text-center">
          {phase === 'countdown' && (
            <Countdown onComplete={handleCountdownComplete} />
          )}

          {phase === 'spinning' && (
            <div className="space-y-8">
              <h1 className="text-4xl font-bold gradient-text mb-8">
                Drawing Winning Number...
              </h1>
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

          {phase === 'redraw' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-8"
            >
              <div className="bg-destructive/20 border-4 border-destructive rounded-xl p-16 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-destructive/30"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                />
                <h1 className="text-7xl font-bold text-destructive mb-6 relative z-10">
                  NO TICKET FOUND!
                </h1>
                <p className="text-3xl text-muted-foreground relative z-10">
                  Redrawing in 2 seconds...
                </p>
              </div>
            </motion.div>
          )}

          {phase === 'winner' && winner && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <Trophy className="h-32 w-32 mx-auto text-primary animate-pulse-glow" />
              <h1 className="text-6xl font-bold gradient-text mb-4">
                We Have a Winner!
              </h1>
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-8 rounded-xl">
                <p className="text-2xl text-muted-foreground mb-2">Winning Ticket</p>
                <p className="text-7xl font-bold gradient-text mb-6">{winner.ticket_number}</p>
                <p className="text-3xl font-semibold mb-2">{winner.player_name}</p>
                <p className="text-xl text-muted-foreground">{winner.player_email}</p>
              </div>
              <Button
                onClick={() => navigate(`/manage-game/${id}`)}
                className="mt-8"
                size="lg"
              >
                Back to Game Management
              </Button>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
