import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/support/tickets
 * Fetch all support tickets (for admin) or user's tickets (if userId param provided)
 * Query params: userId (optional), status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For each ticket, also fetch its messages
    if (data && data.length > 0) {
      const ticketIds = data.map(t => t.id);
      const { data: messagesData, error: msgError } = await supabase
        .from('support_messages')
        .select('*')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true });

      if (msgError) {
        return NextResponse.json({ error: msgError.message }, { status: 500 });
      }

      const ticketsWithMessages = data.map(ticket => ({
        ...ticket,
        messages: (messagesData || []).filter(m => m.ticket_id === ticket.id),
      }));

      return NextResponse.json({ tickets: ticketsWithMessages });
    }

    return NextResponse.json({ tickets: data || [] });
  } catch (err) {
    console.error('Error fetching support tickets:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 * Body: { user_id, user_name, subject, message, category, priority }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, user_name, subject, message, category, priority } = body;

    if (!user_id || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create ticket
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id,
        user_name: user_name || 'مستخدم',
        subject,
        message,
        category: category || 'general',
        status: 'open',
        priority: priority || 'medium',
      })
      .select()
      .single();

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 });
    }

    // Insert first message
    const { error: msgError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketData.id,
        sender_id: user_id,
        sender_type: 'user',
        sender_name: user_name || 'مستخدم',
        sender_role: 'user',
        message,
      });

    if (msgError) {
      console.error('Error creating first message:', msgError);
    }

    return NextResponse.json({ ticket: ticketData }, { status: 201 });
  } catch (err) {
    console.error('Error creating support ticket:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
