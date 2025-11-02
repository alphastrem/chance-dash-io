import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DrawRequest {
  game_id: string;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TicketWithPlayer {
  id: string;
  number: number;
  player_id: string;
  players: Player | Player[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { game_id }: DrawRequest = await req.json();

    if (!game_id) {
      return new Response(
        JSON.stringify({ error: 'game_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Draw requested for game ${game_id} by user ${user.id}`);

    // Verify caller is the game host or admin
    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select('id, max_tickets, created_by_user_id, status')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      console.error('Game fetch error:', gameError);
      return new Response(
        JSON.stringify({ error: 'Game not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is the game host
    if (game.created_by_user_id !== user.id) {
      // Check if user has admin or host role
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'host']);

      if (!roles || roles.length === 0) {
        console.error('User is not authorized to draw this game');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Only the game host can execute the draw' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify game is in locked status
    if (game.status !== 'locked') {
      return new Response(
        JSON.stringify({ error: 'Game must be locked before drawing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use cryptographically secure randomness
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const winningNumber = (randomBytes[0] % game.max_tickets) + 1;
    
    console.log(`Generated winning number: ${winningNumber} for game ${game_id}`);

    // Find winner ticket
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('id, number, player_id, players(id, first_name, last_name, email)')
      .eq('game_id', game_id)
      .eq('number', winningNumber)
      .eq('eligible', true)
      .maybeSingle();

    if (ticketError) {
      console.error('Ticket fetch error:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Error fetching ticket' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = {
      winningNumber,
      hasWinner: !!ticket,
      winner: null as { ticket_number: number; player_name: string; player_email: string } | null,
    };

    if (ticket) {
      const ticketData = ticket as TicketWithPlayer;
      const player = Array.isArray(ticketData.players) ? ticketData.players[0] : ticketData.players;
      
      // Record the draw in database
      const { error: drawError } = await supabaseClient
        .from('draws')
        .insert({
          game_id: game_id,
          winner_ticket_id: ticket.id,
          algorithm: 'crypto.getRandomValues',
          audit_json: {
            winning_number: winningNumber,
            timestamp: new Date().toISOString(),
            random_bytes_used: randomBytes[0],
          },
        });

      if (drawError) {
        console.error('Draw insert error:', drawError);
        return new Response(
          JSON.stringify({ error: 'Failed to record draw' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update game status to drawn
      const { error: updateError } = await supabaseClient
        .from('games')
        .update({ status: 'drawn' })
        .eq('id', game_id);

      if (updateError) {
        console.error('Game update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update game status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      response.winner = {
        ticket_number: ticket.number,
        player_name: `${player.first_name} ${player.last_name}`,
        player_email: player.email,
      };

      console.log(`Winner found: Ticket #${ticket.number} - ${player.first_name} ${player.last_name}`);
    } else {
      console.log(`No ticket found for winning number ${winningNumber} - redraw needed`);
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in execute-draw:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
