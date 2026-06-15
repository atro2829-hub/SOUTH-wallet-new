import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/support/livechat
 * Fetch all live chats (for admin) or a specific user's active chat
 * Query params: userId (optional), status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = supabase
      .from('support_livechat')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (status) {
      query = query.eq('status', status);
    } else {
      // By default, only show non-closed chats for admin
      if (!userId) {
        query = query.neq('status', 'closed');
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chats: data || [] });
  } catch (err) {
    console.error('Error fetching live chats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/support/livechat
 * Send a message to a live chat (as admin)
 * Body: { chat_id, sender_id, sender_name, content }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_id, sender_id, sender_name, content } = body;

    if (!chat_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert admin message
    const { data: msgData, error: msgError } = await supabase
      .from('livechat_messages')
      .insert({
        chat_id,
        sender_id: sender_id || null,
        sender_type: 'admin',
        sender_name: sender_name || 'الدعم',
        message_type: 'text',
        content,
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Update chat status and timestamp
    await supabase
      .from('support_livechat')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', chat_id);

    return NextResponse.json({ message: msgData }, { status: 201 });
  } catch (err) {
    console.error('Error sending livechat message:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
