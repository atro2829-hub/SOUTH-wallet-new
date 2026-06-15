import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/direct-chats
 * Fetch all direct chats (for admin monitoring) or a user's chats
 * Query params: userId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const { data, error } = await supabase
        .from('direct_chats')
        .select('*')
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ chats: data || [] });
    }

    // All chats for admin
    const { data, error } = await supabase
      .from('direct_chats')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chats: data || [] });
  } catch (err) {
    console.error('Error fetching direct chats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
