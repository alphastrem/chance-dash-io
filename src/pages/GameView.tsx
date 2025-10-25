import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Coins, Users } from 'lucide-react';
import { toast } from 'sonner';

type Game = {
  id: string;
  name: string;
  code6: string;
  status: string;
  ticket_price_minor: number;
  draw_at: string;
  created_at: string;
};

export default function GameView() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
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
      }
    } catch (error: any) {
      console.error('Error fetching game:', error);
      toast.error(error.message || 'Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'open': return 'default';
      case 'locked': return 'outline';
      case 'drawn': return 'default';
      case 'closed': return 'secondary';
      default: return 'secondary';
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
            <Badge variant={getStatusColor(game.status)} className="text-lg px-4 py-2">
              {game.status}
            </Badge>
          </div>

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

          {game.status === 'draft' && (
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <p className="text-muted-foreground">
                This game is in draft mode and not yet open for entries.
              </p>
            </div>
          )}

          {game.status === 'open' && (
            <div className="text-center">
              <Button size="lg" className="gap-2">
                Buy Tickets
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
