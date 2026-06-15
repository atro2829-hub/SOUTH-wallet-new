import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/escrow-chats
 * Fetch all escrow chats (for admin) or a specific escrow's chat
 * Query params: escrowId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const escrowId = searchParams.get('escrowId');

    if (escrowId) {
      const { data, error } = await supabase
        .from('escrow_chats')
        .select('*')
        .eq('escrow_id', escrowId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Also get messages
      if (data) {
        const { data: messages, error: msgError } = await supabase
          .from('escrow_chat_messages')
          .select('*')
          .eq('chat_id', data.id)
          .order('created_at', { ascending: true });

        if (msgError) {
          return NextResponse.json({ error: msgError.message }, { status: 500 });
        }

        return NextResponse.json({ chat: data, messages: messages || [] });
      }

      return NextResponse.json({ chat: null, messages: [] });
    }

    // All escrow chats for admin
    const { data, error } = await supabase
      .from('escrow_chats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chats: data || [] });
  } catch (err) {
    console.error('Error fetching escrow chats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/escrow-chats
 * Send a message in an escrow chat (typically as admin)
 * Body: { chat_id, sender_id, sender_name, sender_role, message }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_id, sender_id, sender_name, sender_role, message } = body;

    if (!chat_id || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('escrow_chat_messages')
      .insert({
        chat_id,
        sender_id: sender_id || null,
        sender_name: sender_name || 'الأدمن',
        sender_role: sender_role || 'admin',
        message,
        message_type: 'text',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update escrow_chat updated_at
    await supabase
      .from('escrow_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chat_id);

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err) {
    console.error('Error sending escrow chat message:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
