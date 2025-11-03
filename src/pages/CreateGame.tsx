import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { gameSchema } from '@/lib/validationSchemas';

export default function CreateGame() {
  const navigate = useNavigate();
  const { user, isHost } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    ticketPrice: '',
    maxTickets: '100',
    drawDate: '',
    drawTime: '',
  });

  const [prizeImage, setPrizeImage] = useState<File | null>(null);
  const [prizeImagePreview, setPrizeImagePreview] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPrizeImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrizeImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isHost) {
    navigate('/dashboard');
    return null;
  }

  const generateCode6 = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = gameSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);

    try {
      // Convert price to minor units (e.g., £2.50 -> 250)
      const ticketPriceMinor = Math.round(parseFloat(formData.ticketPrice) * 100);
      const maxTickets = parseInt(formData.maxTickets);
      
      // Combine date and time
      const drawAt = new Date(`${formData.drawDate}T${formData.drawTime}`).toISOString();
      
      // Generate unique 6-digit code
      let code6 = generateCode6();
      let attempts = 0;
      
      // Check uniqueness
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('games')
          .select('code6')
          .eq('code6', code6)
          .single();
        
        if (!existing) break;
        code6 = generateCode6();
        attempts++;
      }

      // Upload prize image if provided
      let prizeImageUrl = null;
      if (prizeImage) {
        const fileExt = prizeImage.name.split('.').pop();
        const fileName = `${code6}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('prize-images')
          .upload(fileName, prizeImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('prize-images')
          .getPublicUrl(fileName);
        
        prizeImageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('games')
        .insert({
          name: formData.name,
          ticket_price_minor: ticketPriceMinor,
          max_tickets: maxTickets,
          draw_at: drawAt,
          code6: code6,
          status: 'open',
          created_by_user_id: user!.id,
          prize_image_url: prizeImageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await supabase.from('audit_logs').insert({
        actor_user_id: user!.id,
        game_id: data.id,
        event_type: 'GAME_CREATE',
        event_data: { gameName: formData.name, code6 },
      });

      toast.success(`Game created! Code: ${code6}`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast.error(error.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="p-8 glass">
          <h1 className="text-3xl font-bold gradient-text mb-2">Create New Game</h1>
          <p className="text-muted-foreground mb-8">
            Set up a new raffle game with prize details and draw schedule
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Prize Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium Headphones"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="prizeImage">Prize Image (Optional)</Label>
              <Input
                id="prizeImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1"
              />
              {prizeImagePreview && (
                <div className="mt-2">
                  <img 
                    src={prizeImagePreview} 
                    alt="Prize preview" 
                    className="w-full max-w-sm h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Upload an image of the prize (optional)
              </p>
            </div>

            <div>
              <Label htmlFor="ticketPrice">Ticket Price (£) *</Label>
              <Input
                id="ticketPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.ticketPrice}
                onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                placeholder="e.g., 2.50"
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the price per ticket in pounds
              </p>
            </div>

            <div>
              <Label htmlFor="maxTickets">Maximum Tickets *</Label>
              <Input
                id="maxTickets"
                type="number"
                min="1"
                value={formData.maxTickets}
                onChange={(e) => setFormData({ ...formData, maxTickets: e.target.value })}
                placeholder="e.g., 100"
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of tickets that can be sold
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="drawDate">Draw Date *</Label>
                <Input
                  id="drawDate"
                  type="date"
                  value={formData.drawDate}
                  onChange={(e) => setFormData({ ...formData, drawDate: e.target.value })}
                  required
                  className="mt-1"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="drawTime">Draw Time *</Label>
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Game
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
