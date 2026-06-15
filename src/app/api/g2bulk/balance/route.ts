import { NextResponse } from 'next/server';
import { G2BULK_API_KEY, G2BULK_BASE_URL } from '@/lib/api-providers';
import { supabase } from '@/lib/supabase';


/**
 * GET /api/g2bulk/balance
 * Check G2Bulk API account balance (always in USD).
 */
export async function GET() {
  try {
    // Get the provider config from Supabase or use defaults
    let apiKey = G2BULK_API_KEY;
    let baseUrl = G2BULK_BASE_URL;

    // Try to get from Supabase first
    const { data: providerData } = await supabase
      .from('api_providers')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (providerData && providerData.length > 0) {
      const provider = providerData[0];
      apiKey = provider.api_key || apiKey;
      baseUrl = provider.api_url || baseUrl;
    }

    const headers: Record<string, string> = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${baseUrl}/v1/getMe`, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { success: false, error: `API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const result = {
      success: data.success ?? true,
      user_id: data.user_id,
      username: data.username,
      first_name: data.first_name,
      balance: data.balance ?? 0,
      currency: 'USD' as const,
    };

    // Update provider balance in Supabase
    if (providerData && providerData.length > 0) {
      await supabase
        .from('api_providers')
        .update({
          balance: result.balance,
          balance_currency: 'USD',
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerData[0].id);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, balance: 0, currency: 'USD' },
      { status: 500 }
    );
  }
}
