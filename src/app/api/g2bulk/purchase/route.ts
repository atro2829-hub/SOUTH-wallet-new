import { NextResponse } from 'next/server';
import { G2BULK_API_KEY, G2BULK_BASE_URL } from '@/lib/api-providers';
import { supabase } from '@/lib/supabase';


/**
 * POST /api/g2bulk/purchase
 * Purchase a product from G2Bulk API.
 * Body: { productId: number, quantity?: number, customerId?: string }
 * Returns the purchase result with order_id and delivery info.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity = 1, customerId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
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

    // Make the purchase request
    const purchaseBody: Record<string, any> = { quantity };
    if (customerId) purchaseBody.customer_id = customerId;

    const response = await fetch(`${baseUrl}/v1/products/${productId}/purchase`, {
      method: 'POST',
      headers,
      body: JSON.stringify(purchaseBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { success: false, error: `Purchase failed (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If purchase was successful, create an order record in Supabase
    if (data.success !== false) {
      try {
        const orderId = data.order_id || data.data?.id || `g2bulk-${Date.now()}`;
        await supabase.from('orders').insert({
          id: String(orderId),
          user_id: customerId || 'anonymous',
          provider_id: providerId,
          provider_name: providerName,
          package_id: String(productId),
          package_name: data.product_title || data.data?.product_title || `Product ${productId}`,
          customer_input: customerId || '',
          amount: data.price || data.data?.price || 0,
          currency: 'USD',
          cost_price: data.cost || data.data?.cost || 0,
          cost_currency: 'USD',
          status: data.status === 'COMPLETED' ? 'completed' : 'pending',
          execution_type: 'api',
          api_provider_id: providerId,
          api_product_id: String(productId),
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
      order_id: data.order_id || data.data?.id,
      product_id: productId,
      product_title: data.product_title || data.data?.product_title,
      status: data.status || data.data?.status || 'PENDING',
      delivery_items: data.delivery_items || data.data?.delivery_items,
      message: data.message || (data.success !== false ? 'Purchase successful' : 'Purchase failed'),
      currency: 'USD',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, status: 'FAILED' },
      { status: 500 }
    );
  }
}
