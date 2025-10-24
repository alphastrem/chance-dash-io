import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut, isHost } = useAuth();
  const navigate = useNavigate();

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
            <p className="text-3xl font-bold gradient-text">0</p>
          </Card>
          
          <Card className="p-6 glass">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Live Games</h3>
            <p className="text-3xl font-bold gradient-text">0</p>
          </Card>
          
          <Card className="p-6 glass">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed</h3>
            <p className="text-3xl font-bold gradient-text">0</p>
          </Card>
          
          <Card className="p-6 glass">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Players</h3>
            <p className="text-3xl font-bold gradient-text">0</p>
          </Card>
        </div>
        
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
      </div>
    </div>
  );
}
