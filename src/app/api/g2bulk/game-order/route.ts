import { NextResponse } from 'next/server';
import { G2BULK_API_KEY, G2BULK_BASE_URL } from '@/lib/api-providers';
import { supabase } from '@/lib/supabase';


/**
 * POST /api/g2bulk/game-order
 * Place a game top-up order via G2Bulk API.
 * Body: {
 *   gameCode: string,
 *   catalogueName: string,
 *   playerId: string,
 *   serverId?: string,
 *   charname?: string,
 *   remark?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameCode, catalogueName, playerId, serverId, charname, remark } = body;

    if (!gameCode || !catalogueName || !playerId) {
      return NextResponse.json(
        { success: false, error: 'gameCode, catalogueName, and playerId are required' },
        { status: 400 }
      );
    }

    // Get the provider config from Supabase or use defaults
    let apiKey = G2BULK_API_KEY;
    let baseUrl = G2BULK_BASE_URL;
    let providerId = 'g2bulk';
    let providerName = 'G2Bulk';

    const { data: providerData } = await supabase
      .from('api_providers')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (providerData && providerData.length > 0) {
      const provider = providerData[0];
      apiKey = provider.api_key || apiKey;
      baseUrl = provider.api_url || baseUrl;
      providerId = provider.id;
      providerName = provider.name;
    }

    const headers: Record<string, string> = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };

    // Build the game order request body
    const orderBody: Record<string, any> = {
      catalogue_name: catalogueName,
      player_id: playerId,
    };
    if (serverId) orderBody.server_id = serverId;
    if (charname) orderBody.charname = charname;
    if (remark) orderBody.remark = remark;

    const response = await fetch(`${baseUrl}/v1/games/${gameCode}/order`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { success: false, error: `Game order failed (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If the order was successful, create an order record in Supabase
    if (data.success !== false && data.order) {
      try {
        const orderId = data.order.order_id || `game-${Date.now()}`;
        await supabase.from('orders').insert({
          id: String(orderId),
          user_id: playerId || 'anonymous',
          provider_id: providerId,
          provider_name: providerName,
          package_id: catalogueName,
          package_name: catalogueName,
          customer_input: playerId,
          amount: data.order.price || 0,
          currency: 'USD',
          cost_price: data.order.price || 0,
          cost_currency: 'USD',
          status: data.order.status === 'COMPLETED' ? 'completed' : 'pending',
          execution_type: 'api',
          api_provider_id: providerId,
          api_product_id: '',
          api_order_id: String(orderId),
          api_response: data,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Order logging is non-critical
      }
    }

    return NextResponse.json({
      success: data.success !== false,
      message: data.message || (data.success !== false ? 'Game order placed successfully' : 'Game order failed'),
      order: data.order ? {
        order_id: data.order.order_id,
        game: data.order.game,
        catalogue: data.order.catalogue,
        player_id: data.order.player_id,
        player_name: data.order.player_name,
        price: data.order.price,
        status: data.order.status,
        currency: 'USD',
      } : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
