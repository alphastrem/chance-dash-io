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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Trash2, Play, Lock, Award, Upload, UserPlus, Sparkles, AlertTriangle, Copy, ExternalLink, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { playerSchema, csvPlayerSchema } from '@/lib/validationSchemas';
import CSVColumnMapper, { ColumnMapping } from '@/components/CSVColumnMapper';

type GameStatus = Database['public']['Enums']['game_status'];

type Game = {
  id: string;
  name: string;
  code6: string;
  status: GameStatus;
  ticket_price_minor: number;
  draw_at: string;
  created_by_user_id: string;
  max_tickets: number;
  has_manual_entries: boolean;
  prize_image_url?: string;
};

type Winner = {
  first_name: string;
  last_name_protected: string;
  ticket_number: number;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
};

type Ticket = {
  id: string;
  number: number;
  player_id: string;
  game_id: string;
};

export default function ManageGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isHost } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState<Winner | null>(null);
  
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

  const [csvMappingOpen, setCsvMappingOpen] = useState(false);
  const [csvRawData, setCsvRawData] = useState<string[][]>([]);

  useEffect(() => {
    if (!isHost) {
      navigate('/dashboard');
      return;
    }
    if (id) {
      fetchGame();
      fetchPlayers();
      fetchTickets();
      fetchWinner();
    }
  }, [id, isHost]);

  const fetchWinner = async () => {
    try {
      const { data, error } = await supabase
        .from('public_winners')
        .select('first_name, last_name_protected, ticket_number')
        .eq('game_id', id)
        .maybeSingle();

      if (error) throw error;
      setWinner(data);
    } catch (error: any) {
      console.error('Error fetching winner:', error);
    }
  };

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

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('game_id', id)
        .order('number');

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
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

  const generateUniqueTicketNumber = (existingNumbers: number[], maxTickets: number): number => {
    const availableNumbers = new Set<number>();
    for (let i = 1; i <= maxTickets; i++) {
      availableNumbers.add(i);
    }
    existingNumbers.forEach(num => availableNumbers.delete(num));
    
    const available = Array.from(availableNumbers);
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate player data
    const validation = playerSchema.safeParse(newPlayer);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      if (!game) return;

      // Check if max tickets reached
      if (tickets.length >= game.max_tickets) {
        toast.error(`Maximum tickets (${game.max_tickets}) reached`);
        return;
      }

      // Insert player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: id,
          first_name: newPlayer.firstName,
          last_name: newPlayer.lastName,
          email: newPlayer.email,
          phone: newPlayer.phone || null,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // Generate unique ticket number
      const existingNumbers = tickets.map(t => t.number);
      const ticketNumber = generateUniqueTicketNumber(existingNumbers, game.max_tickets);

      // Insert ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          game_id: id,
          player_id: playerData.id,
          number: ticketNumber,
          eligible: true,
        });

      if (ticketError) throw ticketError;

      // Mark game as having manual entries
      if (!game.has_manual_entries) {
        await supabase
          .from('games')
          .update({ has_manual_entries: true })
          .eq('id', id);
      }

      toast.success(`Player added with ticket #${ticketNumber}`);
      setNewPlayer({ firstName: '', lastName: '', email: '', phone: '' });
      fetchPlayers();
      fetchTickets();
      fetchGame();
    } catch (error: any) {
      console.error('Error adding player:', error);
      toast.error(error.message || 'Failed to add player');
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (game?.has_manual_entries) {
      toast.error('Cannot upload CSV after manual entries have been added');
      e.target.value = '';
      return;
    }

    if (game?.status === 'locked' || game?.status === 'drawn') {
      toast.error('Cannot upload CSV when entries are locked');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Parse all rows including header
        const allRows = lines.map(line => line.split(',').map(v => v.trim()));
        
        if (allRows.length < 2) {
          toast.error('CSV must contain at least a header row and one data row');
          return;
        }

        // Open mapping dialog
        setCsvRawData(allRows);
        setCsvMappingOpen(true);
      } catch (error: any) {
        console.error('Error reading CSV:', error);
        toast.error('Failed to read CSV file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCSVImport = async (mapping: ColumnMapping) => {
    try {
      if (!game) return;

      // Skip header row
      const dataRows = csvRawData.slice(1);
      
      // Validate and prepare players
      const validatedPlayers = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const firstName = row[mapping.firstNameIndex];
        const lastName = row[mapping.lastNameIndex];
        const email = row[mapping.emailIndex];
        const phone = mapping.phoneIndex !== null ? row[mapping.phoneIndex] : undefined;
        
        const validation = csvPlayerSchema.safeParse({
          firstName,
          lastName,
          email,
          phone,
        });

        if (!validation.success) {
          toast.error(`Row ${i + 2}: ${validation.error.errors[0].message}`);
          return;
        }

        validatedPlayers.push({
          firstName,
          lastName,
          email,
          phone: phone || null,
        });
      }

      // Check if total would exceed max tickets
      if (tickets.length + validatedPlayers.length > game.max_tickets) {
        toast.error(`Cannot import: would exceed maximum tickets (${game.max_tickets})`);
        return;
      }

      // Insert players and generate tickets
      const existingNumbers = tickets.map(t => t.number);
      const availableNumbers = new Set<number>();
      for (let i = 1; i <= game.max_tickets; i++) {
        availableNumbers.add(i);
      }
      existingNumbers.forEach(num => availableNumbers.delete(num));
      const numbersArray = Array.from(availableNumbers);

      for (const player of validatedPlayers) {
        // Insert player
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .insert({
            game_id: id,
            first_name: player.firstName,
            last_name: player.lastName,
            email: player.email,
            phone: player.phone,
          })
          .select()
          .single();

        if (playerError) throw playerError;

        // Assign sequential ticket number
        const ticketNumber = numbersArray.shift();
        if (!ticketNumber) throw new Error('No available ticket numbers');

        // Insert ticket
        const { error: ticketError } = await supabase
          .from('tickets')
          .insert({
            game_id: id,
            player_id: playerData.id,
            number: ticketNumber,
            eligible: true,
          });

        if (ticketError) throw ticketError;
      }

      toast.success(`${validatedPlayers.length} players imported with tickets`);
      setCsvMappingOpen(false);
      setCsvRawData([]);
      fetchPlayers();
      fetchTickets();
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast.error(error.message || 'Failed to import players');
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

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold mb-1">Player View Link</h3>
                <p className="text-xs text-muted-foreground mb-2">Share this link with participants to watch the draw</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background px-3 py-1 rounded border">
                    {window.location.origin}/player/{game.code6}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/player/${game.code6}`);
                      toast.success('Link copied to clipboard');
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/player/${game.code6}`, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {winner && (
            <Card className="p-6 mb-6 bg-gradient-to-r from-primary/20 to-accent/20">
              <div className="flex items-center gap-4">
                <Trophy className="h-12 w-12 text-primary" />
                <div>
                  <h3 className="text-2xl font-bold gradient-text mb-1">Winner!</h3>
                  <p className="text-lg font-semibold">
                    {winner.first_name} {winner.last_name_protected}
                  </p>
                  <p className="text-muted-foreground">
                    Ticket #{winner.ticket_number}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            {game.status === 'open' && (
              <Button onClick={() => handleStatusChange('locked')} className="gap-2">
                <Lock className="h-4 w-4" />
                Lock Entries
              </Button>
            )}
            {game.status === 'locked' && tickets.length > 0 && (
              <Button 
                onClick={() => navigate(`/draw/${id}`)} 
                className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Start Draw
              </Button>
            )}
            {game.status === 'locked' && tickets.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Add players and tickets before starting the draw
                </AlertDescription>
              </Alert>
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
                   <div>
                     <h3 className="text-lg font-semibold">Add Players</h3>
                     <p className="text-sm text-muted-foreground">
                       {tickets.length} / {game.max_tickets} tickets assigned
                     </p>
                   </div>
                   <div>
                     <Input
                       type="file"
                       accept=".csv"
                       onChange={handleCSVUpload}
                       className="hidden"
                       id="csv-upload"
                       disabled={game.has_manual_entries || game.status === 'locked' || game.status === 'drawn'}
                     />
                     <Label htmlFor="csv-upload" className="cursor-pointer">
                       <Button 
                         type="button" 
                         variant="outline" 
                         className="gap-2" 
                         onClick={() => document.getElementById('csv-upload')?.click()}
                         disabled={game.has_manual_entries || game.status === 'locked' || game.status === 'drawn'}
                       >
                         <Upload className="h-4 w-4" />
                         Upload CSV
                       </Button>
                     </Label>
                   </div>
                 </div>

                 {game.has_manual_entries && (
                   <Alert variant="destructive">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertDescription>
                       CSV upload is disabled because manual entries have been added. This prevents ticket number conflicts.
                     </AlertDescription>
                   </Alert>
                 )}

                 {(game.status === 'locked' || game.status === 'drawn') && (
                   <Alert>
                     <AlertTriangle className="h-4 w-4" />
                     <AlertDescription>
                       Player entries are locked. Cannot add new players or upload CSV.
                     </AlertDescription>
                   </Alert>
                 )}

                <p className="text-sm text-muted-foreground">
                  CSV format: FirstName, LastName, Email, Phone (optional)
                </p>

                 <form onSubmit={handleAddPlayer} className="grid grid-cols-2 gap-4">
                   <Input
                     placeholder="First Name"
                     value={newPlayer.firstName}
                     onChange={(e) => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                     required
                     disabled={game.status === 'locked' || game.status === 'drawn'}
                   />
                   <Input
                     placeholder="Last Name"
                     value={newPlayer.lastName}
                     onChange={(e) => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                     required
                     disabled={game.status === 'locked' || game.status === 'drawn'}
                   />
                   <Input
                     type="email"
                     placeholder="Email"
                     value={newPlayer.email}
                     onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                     required
                     disabled={game.status === 'locked' || game.status === 'drawn'}
                   />
                   <Input
                     placeholder="Phone (optional)"
                     value={newPlayer.phone}
                     onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                     disabled={game.status === 'locked' || game.status === 'drawn'}
                   />
                   <Button 
                     type="submit" 
                     className="col-span-2 gap-2"
                     disabled={game.status === 'locked' || game.status === 'drawn'}
                   >
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
                    {players.map((player) => {
                      const playerTicket = tickets.find(t => t.player_id === player.id);
                      return (
                        <Card key={player.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {playerTicket && (
                                <Badge variant="outline" className="text-lg font-bold px-3 py-1">
                                  #{playerTicket.number}
                                </Badge>
                              )}
                              <div>
                                <p className="font-medium">
                                  {player.first_name} {player.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{player.email}</p>
                              </div>
                            </div>
                            {player.phone && (
                              <p className="text-sm text-muted-foreground">{player.phone}</p>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <CSVColumnMapper
          open={csvMappingOpen}
          onClose={() => {
            setCsvMappingOpen(false);
            setCsvRawData([]);
          }}
          csvData={csvRawData}
          onConfirm={handleCSVImport}
        />
      </div>
    </div>
  );
}
