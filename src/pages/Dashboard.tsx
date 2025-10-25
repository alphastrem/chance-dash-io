import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, LogOut, Calendar, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

type Game = {
  id: string;
  name: string;
  code6: string;
  status: string;
  ticket_price_minor: number;
  draw_at: string;
  created_at: string;
};

export default function Dashboard() {
  const { user, signOut, isHost } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isHost && user) {
      fetchGames();
    }
  }, [isHost, user]);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isHost) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You need host or admin privileges to access this area.
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  const draftGames = games.filter(g => g.status === 'draft').length;
  const liveGames = games.filter(g => g.status === 'open' || g.status === 'locked').length;
  const completedGames = games.filter(g => g.status === 'drawn' || g.status === 'closed').length;

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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => navigate('/create-game')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Game
            </Button>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 glass">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Draft Games</h3>
            <p className="text-3xl font-bold gradient-text">{draftGames}</p>
          </Card>
          
          <Card className="p-6 glass">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Live Games</h3>
            <p className="text-3xl font-bold gradient-text">{liveGames}</p>
          </Card>
          
          <Card className="p-6 glass">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed</h3>
            <p className="text-3xl font-bold gradient-text">{completedGames}</p>
          </Card>
          
          <Card className="p-6 glass">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Games</h3>
            <p className="text-3xl font-bold gradient-text">{games.length}</p>
          </Card>
        </div>
        
        {loading ? (
          <Card className="p-8 glass text-center">
            <p className="text-muted-foreground">Loading games...</p>
          </Card>
        ) : games.length === 0 ? (
          <Card className="p-8 glass text-center">
            <h2 className="text-2xl font-bold mb-4">No games yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first raffle game to get started
            </p>
            <Button onClick={() => navigate('/create-game')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Game
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your Games</h2>
            <div className="grid gap-4">
              {games.map((game) => (
                <Card key={game.id} className="p-6 glass hover:glow transition-all cursor-pointer"
                  onClick={() => navigate(`/game/${game.code6}`)}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{game.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        Code: {game.code6}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(game.status)}>
                      {game.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span>£{(game.ticket_price_minor / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(game.draw_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
