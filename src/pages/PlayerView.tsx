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

type GameStatus = 'draft' | 'open' | 'locked' | 'drawn' | 'closed';

interface Game {
  id: string;
  name: string;
  code6: string;
  status: GameStatus;
  draw_at: string;
  created_by_user_id: string;
  max_tickets: number;
  prize_image_url?: string;
}

interface Winner {
  ticket_number: number;
  first_name: string;
  last_name_protected: string;
}

export default function PlayerView() {
  const { code } = useParams<{ code: string }>();
  const [phase, setPhase] = useState<'waiting' | 'countdown' | 'spinning' | 'winner' | 'redraw'>('waiting');
  const [game, setGame] = useState<Game | null>(null);
  const [maxTickets, setMaxTickets] = useState(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [wheels, setWheels] = useState<number[][]>([]);
  const [finalDigits, setFinalDigits] = useState<number[]>([]);
  const [currentDigitIndex, setCurrentDigitIndex] = useState(0);
  const [revealedDigits, setRevealedDigits] = useState<number[]>([]);
  const [animationType, setAnimationType] = useState<string>('spinning_wheel');
  const [gameId, setGameId] = useState<string>('');
  const [ticketsSold, setTicketsSold] = useState<number>(0);

  useEffect(() => {
    fetchGameData();
    subscribeToGameStatus();
    subscribeToDrawEvents();
  }, [code]);

  const fetchGameData = async () => {
    if (!code) {
      console.error('No game code provided');
      return;
    }
    
    try {
      console.log('Fetching game with code:', code);
      const { data: gameData, error } = await supabase
        .from('games')
        .select('id, name, code6, draw_at, max_tickets, status, created_by_user_id, prize_image_url, profiles(animation_type)')
        .eq('code6', code)
        .single();

      if (error) {
        console.error('Error fetching game:', error);
        throw error;
      }
      
      console.log('Game data loaded:', gameData);
      setGame(gameData);
      setGameId(gameData.id);
      setMaxTickets(gameData.max_tickets);
      
      const hostProfile = gameData.profiles as any;
      if (hostProfile?.animation_type) {
        setAnimationType(hostProfile.animation_type);
      }

      // Fetch ticket count
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameData.id);
      
      setTicketsSold(count || 0);

      if (gameData.status === 'drawn') {
        fetchWinnerData(gameData.id);
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
          if (payload.new.status === 'drawn') {
            fetchWinnerData(payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToDrawEvents = () => {
    if (!gameId) return;
    
    const channel = supabase
      .channel(`draw-${gameId}`)
      .on('broadcast', { event: 'draw_started' }, (payload) => {
        console.log('Draw started broadcast received:', payload);
        setPhase('countdown');
      })
      .on('broadcast', { event: 'phase_change' }, async (payload) => {
        console.log('Phase change broadcast received:', payload);
        const newPhase = payload.payload.phase;
        if (newPhase === 'spinning') {
          // Fetch the winning number before showing animation
          await fetchLatestDrawData(gameId);
          setPhase('spinning');
        } else if (newPhase === 'redraw') {
          setPhase('redraw');
          setTimeout(() => {
            handleRedraw();
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchLatestDrawData = async (gameId: string) => {
    try {
      const { data: draw, error } = await supabase
        .from('draws')
        .select('winner_ticket_id, audit_json')
        .eq('game_id', gameId)
        .order('executed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (draw) {
        const winning = (draw.audit_json as any)?.winning_number;
        if (winning) {
          setWinningNumber(winning);
        }
      }
    } catch (error: any) {
      console.error('Error fetching draw data:', error);
    }
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
        
        // Use public_winners view to get winner info with GDPR protection
        const { data: winner } = await supabase
          .from('public_winners')
          .select('first_name, last_name_protected, ticket_number')
          .eq('game_id', gameId)
          .maybeSingle();

        if (winner) {
          setWinner({
            ticket_number: winner.ticket_number,
            first_name: winner.first_name || '',
            last_name_protected: winner.last_name_protected || ''
          });
        }
      }

      setPhase('winner');
    } catch (error: any) {
      console.error('Error fetching winner:', error);
    }
  };

  const handleCountdownComplete = () => {
    // Wait for host to broadcast spinning phase
    // The phase will be set via subscribeToDrawEvents
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
  };

  const handleRedraw = async () => {
    setCurrentDigitIndex(0);
    setRevealedDigits([]);
    setWinningNumber(null);
    setWinner(null);
    generateWheels(maxTickets);
    
    // Fetch new winning number after redraw
    await fetchLatestDrawData(gameId);
    
    setPhase('spinning');
  };

  useEffect(() => {
    if (phase === 'spinning' && wheels.length === 0) {
      generateWheels(maxTickets);
    }
  }, [phase, wheels.length, maxTickets]);

  const handleWheelComplete = () => {
    if (!finalDigits || finalDigits.length === 0) return;
    
    setRevealedDigits(prev => [...prev, finalDigits[currentDigitIndex]]);
    
    if (currentDigitIndex < finalDigits.length - 1) {
      setCurrentDigitIndex(prev => prev + 1);
    } else {
      // Wait for winner data from database
      setTimeout(() => {
        if (winner) {
          setPhase('winner');
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (winningNumber && maxTickets) {
      const numDigits = maxTickets.toString().length;
      setFinalDigits(winningNumber.toString().padStart(numDigits, '0').split('').map(Number));
    }
  }, [winningNumber, maxTickets]);

  useEffect(() => {
    // Automatically transition to winner phase when winner data is available
    // and all animations are complete
    if (winner && phase === 'spinning' && revealedDigits.length === finalDigits.length && finalDigits.length > 0) {
      setTimeout(() => {
        setPhase('winner');
      }, 1000);
    }
  }, [winner, phase, revealedDigits.length, finalDigits.length]);

  if (!code) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="p-12">
          <h1 className="text-2xl font-bold text-destructive">Invalid Game Code</h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center bg-gradient-to-br from-background to-secondary">
      <div className="max-w-6xl w-full">
        <Card className="p-12 text-center bg-card border-border shadow-xl">
          {!game && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Loading game...</h2>
              <p className="text-muted-foreground">Game Code: {code}</p>
            </div>
          )}
          
          {game && <h1 className="text-5xl font-bold gradient-text mb-8">{game.name}</h1>}

          {phase === 'waiting' && game && (
            <div className="space-y-8">
              {game.prize_image_url && (
                <div className="mb-8">
                  <img 
                    src={game.prize_image_url} 
                    alt={game.name}
                    className="w-full max-w-2xl mx-auto h-80 object-cover rounded-lg shadow-xl"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
                <Card className="p-6 glass">
                  <div className="text-sm text-muted-foreground mb-2">Draw Date & Time</div>
                  <div className="text-2xl font-bold text-primary">
                    {new Date(game.draw_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xl text-foreground mt-1">
                    {new Date(game.draw_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </Card>
                
                <Card className="p-6 glass">
                  <div className="text-sm text-muted-foreground mb-2">Tickets Sold</div>
                  <div className="text-4xl font-bold gradient-text">
                    {ticketsSold} <span className="text-2xl text-muted-foreground">/ {game.max_tickets}</span>
                  </div>
                </Card>
              </div>

              <div className="mt-8">
                <p className="text-2xl text-muted-foreground mb-4">
                  Waiting for the draw to begin...
                </p>
                <div className="text-3xl font-bold text-primary">
                  Game Code: {code}
                </div>
              </div>
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

          {phase === 'redraw' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-8"
            >
              <div className="bg-gradient-to-br from-destructive/30 to-destructive/10 border-4 border-destructive rounded-2xl p-12 relative overflow-hidden shadow-2xl">
                <motion.div
                  className="absolute inset-0 bg-destructive/20"
                  animate={{ 
                    opacity: [0, 0.6, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 0.6, repeat: 2 }}
                />
                <motion.h1 
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-destructive mb-6 relative z-10"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  NO TICKET SOLD!
                </motion.h1>
                <motion.p 
                  className="text-2xl md:text-3xl font-semibold text-foreground relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Drawing again...
                </motion.p>
              </div>
            </motion.div>
          )}

          {phase === 'winner' && winner && game && (
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
              {game.prize_image_url && (
                <div className="mb-6">
                  <img 
                    src={game.prize_image_url} 
                    alt={game.name}
                    className="w-full max-w-md mx-auto h-64 object-cover rounded-lg shadow-lg"
                  />
                </div>
              )}
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-8 rounded-xl">
                <p className="text-2xl text-muted-foreground mb-2">Winning Ticket</p>
                <p className="text-7xl font-bold gradient-text mb-6">{winner.ticket_number}</p>
                <p className="text-3xl font-semibold">
                  {winner.first_name} {winner.last_name_protected}
                </p>
              </div>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
