import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Coins, Users, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type GameStatus = Database['public']['Enums']['game_status'];

type Game = {
  id: string;
  name: string;
  code6: string;
  status: GameStatus;
  ticket_price_minor: number;
  draw_at: string;
  created_at: string;
  prize_image_url?: string;
};

type Winner = {
  first_name: string;
  last_name_protected: string;
  ticket_number: number;
  draw_date: string;
};

export default function GameView() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      fetchGame();
    }
  }, [code]);

  const fetchGame = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('code6', code)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Game not found');
        setGame(null);
      } else {
        setGame(data);
        
        // Fetch winner if game is drawn
        if (data.status === 'drawn') {
          fetchWinner(data.id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching game:', error);
      toast.error(error.message || 'Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  const fetchWinner = async (gameId: string) => {
    try {
      const { data: winnerData, error: winnerError } = await supabase
        .from('public_winners')
        .select('first_name, last_name_protected, ticket_number, draw_date')
        .eq('game_id', gameId)
        .maybeSingle();

      if (winnerError) throw winnerError;
      if (winnerData) {
        setWinner(winnerData);
      }
    } catch (error: any) {
      console.error('Error fetching winner:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="p-8 glass text-center">
          <p className="text-muted-foreground">Loading game...</p>
        </Card>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="p-8 glass text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Game Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The game code "{code}" doesn't exist or is not available yet.
          </p>
          <Button onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  // If game is drawn, show winner screen similar to PlayerView
  if (game.status === 'drawn' && winner) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <div className="max-w-6xl w-full">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>

          <Card className="p-12 glass text-center">
            <h1 className="text-5xl font-bold gradient-text mb-8">{game.name}</h1>
            
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
                <p className="text-3xl font-semibold mb-4">
                  {winner.first_name} {winner.last_name_protected}
                </p>
                {winner.draw_date && (
                  <p className="text-lg text-muted-foreground">
                    Drawn on {new Date(winner.draw_date).toLocaleDateString()} at {new Date(winner.draw_date).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </motion.div>
          </Card>
        </div>
      </div>
    );
  }

  // For other statuses, show game info
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <Card className="p-8 glass">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">{game.name}</h1>
              <p className="text-muted-foreground font-mono text-lg">
                Game Code: {game.code6}
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {game.status}
            </Badge>
          </div>

          {game.prize_image_url && (
            <div className="mb-6">
              <img 
                src={game.prize_image_url} 
                alt={game.name}
                className="w-full max-w-2xl mx-auto h-96 object-cover rounded-lg shadow-lg"
              />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Price</p>
                <p className="text-xl font-bold">£{(game.ticket_price_minor / 100).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Draw Date</p>
                <p className="text-xl font-bold">
                  {new Date(game.draw_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-xl font-bold capitalize">{game.status}</p>
              </div>
            </div>
          </div>

          {game.status === 'open' && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">This game is open for entries</p>
            </div>
          )}
          
          {game.status === 'locked' && (
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <p className="text-muted-foreground">
                Entries are locked. Waiting for the draw to begin...
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
