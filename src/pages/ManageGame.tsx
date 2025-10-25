import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Trash2, Play, Lock, Award, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

type GameStatus = Database['public']['Enums']['game_status'];

type Game = {
  id: string;
  name: string;
  code6: string;
  status: GameStatus;
  ticket_price_minor: number;
  draw_at: string;
  created_by_user_id: string;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
};

export default function ManageGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isHost } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    ticketPrice: '',
    drawDate: '',
    drawTime: '',
  });

  const [newPlayer, setNewPlayer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (!isHost) {
      navigate('/dashboard');
      return;
    }
    if (id) {
      fetchGame();
      fetchPlayers();
    }
  }, [id, isHost]);

  const fetchGame = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setGame(data);
      
      const drawDate = new Date(data.draw_at);
      setFormData({
        name: data.name,
        ticketPrice: (data.ticket_price_minor / 100).toFixed(2),
        drawDate: drawDate.toISOString().split('T')[0],
        drawTime: drawDate.toTimeString().slice(0, 5),
      });
    } catch (error: any) {
      console.error('Error fetching game:', error);
      toast.error(error.message || 'Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', id);

      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      console.error('Error fetching players:', error);
    }
  };

  const handleUpdateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ticketPriceMinor = Math.round(parseFloat(formData.ticketPrice) * 100);
      const drawAt = new Date(`${formData.drawDate}T${formData.drawTime}`).toISOString();

      const { error } = await supabase
        .from('games')
        .update({
          name: formData.name,
          ticket_price_minor: ticketPriceMinor,
          draw_at: drawAt,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Game updated successfully');
      fetchGame();
    } catch (error: any) {
      console.error('Error updating game:', error);
      toast.error(error.message || 'Failed to update game');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: GameStatus) => {
    try {
      const { error } = await supabase
        .from('games')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        actor_user_id: user!.id,
        game_id: id,
        event_type: 'GAME_STATUS_CHANGE',
        event_data: { oldStatus: game?.status, newStatus },
      });

      toast.success(`Game status changed to ${newStatus}`);
      fetchGame();
    } catch (error: any) {
      console.error('Error changing status:', error);
      toast.error(error.message || 'Failed to change status');
    }
  };

  const handleDeleteGame = async () => {
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Game deleted successfully');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error deleting game:', error);
      toast.error(error.message || 'Failed to delete game');
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('players')
        .insert({
          game_id: id,
          first_name: newPlayer.firstName,
          last_name: newPlayer.lastName,
          email: newPlayer.email,
          phone: newPlayer.phone || null,
        });

      if (error) throw error;

      toast.success('Player added successfully');
      setNewPlayer({ firstName: '', lastName: '', email: '', phone: '' });
      fetchPlayers();
    } catch (error: any) {
      console.error('Error adding player:', error);
      toast.error(error.message || 'Failed to add player');
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row
        const dataLines = lines.slice(1);
        
        const playersToInsert = dataLines.map(line => {
          const [firstName, lastName, email, phone] = line.split(',').map(v => v.trim());
          return {
            game_id: id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone || null,
          };
        });

        const { error } = await supabase
          .from('players')
          .insert(playersToInsert);

        if (error) throw error;

        toast.success(`${playersToInsert.length} players imported successfully`);
        fetchPlayers();
      } catch (error: any) {
        console.error('Error uploading CSV:', error);
        toast.error(error.message || 'Failed to import players');
      }
    };
    reader.readAsText(file);
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
        <Card className="p-8 glass text-center">
          <h2 className="text-2xl font-bold mb-4">Game Not Found</h2>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Game
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the game
                  and all associated player data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteGame}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card className="p-8 glass mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">{game.name}</h1>
              <p className="text-muted-foreground font-mono">Code: {game.code6}</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {game.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {game.status === 'draft' && (
              <Button onClick={() => handleStatusChange('open')} className="gap-2">
                <Play className="h-4 w-4" />
                Open for Entries
              </Button>
            )}
            {game.status === 'open' && (
              <Button onClick={() => handleStatusChange('locked')} className="gap-2">
                <Lock className="h-4 w-4" />
                Lock Entries
              </Button>
            )}
            {game.status === 'locked' && (
              <Button onClick={() => handleStatusChange('drawn')} className="gap-2">
                <Award className="h-4 w-4" />
                Mark as Drawn
              </Button>
            )}
          </div>

          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Game Details</TabsTrigger>
              <TabsTrigger value="players">Players ({players.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <form onSubmit={handleUpdateGame} className="space-y-6">
                <div>
                  <Label htmlFor="name">Prize Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="ticketPrice">Ticket Price (£)</Label>
                  <Input
                    id="ticketPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ticketPrice}
                    onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="drawDate">Draw Date</Label>
                    <Input
                      id="drawDate"
                      type="date"
                      value={formData.drawDate}
                      onChange={(e) => setFormData({ ...formData, drawDate: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="drawTime">Draw Time</Label>
                    <Input
                      id="drawTime"
                      type="time"
                      value={formData.drawTime}
                      onChange={(e) => setFormData({ ...formData, drawTime: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="players" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Add Players</h3>
                  <div>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById('csv-upload')?.click()}>
                        <Upload className="h-4 w-4" />
                        Upload CSV
                      </Button>
                    </Label>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  CSV format: FirstName, LastName, Email, Phone (optional)
                </p>

                <form onSubmit={handleAddPlayer} className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First Name"
                    value={newPlayer.firstName}
                    onChange={(e) => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Last Name"
                    value={newPlayer.lastName}
                    onChange={(e) => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newPlayer.email}
                    onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={newPlayer.phone}
                    onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                  />
                  <Button type="submit" className="col-span-2 gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Player
                  </Button>
                </form>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Current Players</h3>
                {players.length === 0 ? (
                  <p className="text-muted-foreground">No players added yet</p>
                ) : (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <Card key={player.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{player.email}</p>
                          </div>
                          {player.phone && (
                            <p className="text-sm text-muted-foreground">{player.phone}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
