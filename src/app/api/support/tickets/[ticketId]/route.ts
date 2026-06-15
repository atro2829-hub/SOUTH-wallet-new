import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/support/tickets/[ticketId]
 * Fetch a specific ticket with its messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 404 });
    }

    const { data: messages, error: msgError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    return NextResponse.json({
      ticket,
      messages: messages || [],
    });
  } catch (err) {
    console.error('Error fetching ticket:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/support/tickets/[ticketId]
 * Send a reply to a ticket (as admin or user)
 * Body: { sender_id, sender_name, sender_type ('admin'|'user'), sender_role, message }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const { sender_id, sender_name, sender_type, sender_role, message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Insert message
    const { data: msgData, error: msgError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: sender_id || null,
        sender_type: sender_type || 'admin',
        sender_name: sender_name || 'الدعم',
        sender_role: sender_role || sender_type || 'admin',
        message,
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Update ticket status if admin replies
    if (sender_type === 'admin') {
      await supabase
        .from('support_tickets')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);
    }

    return NextResponse.json({ message: msgData }, { status: 201 });
  } catch (err) {
    console.error('Error sending ticket reply:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/support/tickets/[ticketId]
 * Update ticket status
 * Body: { status, assigned_to }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const { status, assigned_to } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }
    }

    if (assigned_to) {
      updates.assigned_to = assigned_to;
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch (err) {
    console.error('Error updating ticket:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
