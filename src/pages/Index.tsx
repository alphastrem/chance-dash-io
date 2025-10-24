import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Sparkles, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const [gameCode, setGameCode] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode.length === 6) {
      navigate(`/game/${gameCode}`);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/20 via-background to-blue-600/20 animate-gradient -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))] -z-10" />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold gradient-text mb-6">
            Raffle Live
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience transparent, fair, and exciting raffle draws in real-time
          </p>
          
          {/* Search Box */}
          <Card className="max-w-md mx-auto p-6 glass glow">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Enter 6-Digit Game Code
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-widest"
                  />
                  <Button type="submit" size="lg" disabled={gameCode.length !== 6}>
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
        
        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          <Card className="p-6 glass text-center hover:glow transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Transparent & Fair</h3>
            <p className="text-muted-foreground">
              Cryptographic verification ensures every draw is provably fair
            </p>
          </Card>
          
          <Card className="p-6 glass text-center hover:glow transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-Time Draws</h3>
            <p className="text-muted-foreground">
              Watch the winning number revealed live with stunning animations
            </p>
          </Card>
          
          <Card className="p-6 glass text-center hover:glow transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Player data protected with encryption and privacy-first design
            </p>
          </Card>
        </div>
        
        {/* CTA */}
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/auth')}
            className="gap-2"
          >
            Host Login
          </Button>
        </div>
      </div>
    </div>
  );
}
