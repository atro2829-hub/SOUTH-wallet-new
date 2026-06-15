import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { G2BULK_API_KEY, G2BULK_BASE_URL } from '@/lib/api-providers';

/**
 * POST /api/g2bulk/sync
 * Sync categories, products, and games from G2Bulk API to Supabase.
 * Also creates section entries for the home screen.
 * Uses batch upserts for better performance.
 */
export async function POST(request: Request) {
  try {
    // Get the provider config from Supabase or use defaults
    let apiKey = G2BULK_API_KEY;
    let baseUrl = G2BULK_BASE_URL;
    let providerId = 'g2bulk';

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
      providerId = provider.id;
    }

    const headers: Record<string, string> = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };

    const results = {
      categories: 0,
      products: 0,
      games: 0,
      sections: 0,
      errors: [] as string[],
    };

    // 1. Sync Categories (batch upsert)
    try {
      const catResponse = await fetch(`${baseUrl}/v1/category`, { headers });
      if (catResponse.ok) {
        const catData = await catResponse.json();
        const categories = catData.categories || [];

        // Batch upsert categories
        const catRows = categories.map((cat: any) => ({
          api_provider_id: providerId,
          api_category_id: String(cat.id),
          title: cat.title,
          title_en: cat.title,
          description: cat.description || '',
          image_url: cat.image_url || '',
          product_count: cat.product_count || 0,
          is_active: true,
          is_synced: true,
          last_synced_at: new Date().toISOString(),
        }));

        if (catRows.length > 0) {
          const { error: catError } = await supabase
            .from('api_categories')
            .upsert(catRows, { onConflict: 'api_provider_id,api_category_id' });

          if (catError) {
            results.errors.push(`Categories batch: ${catError.message}`);
          }
          results.categories = catRows.length;
        }

        // Batch upsert sections for categories
        const sectionRows = categories.map((cat: any) => ({
          id: `g2bulk-${cat.id}`,
          name: cat.title,
          name_en: cat.title,
          description: cat.description || '',
          icon: cat.image_url || '',
          image_url: cat.image_url || '',
          type: 'api' as const,
          api_provider_id: providerId,
          is_active: true,
          sort_order: 1000 + (cat.id || 0),
          updated_at: new Date().toISOString(),
        }));

        if (sectionRows.length > 0) {
          const { error: sectionError } = await supabase
            .from('sections')
            .upsert(sectionRows, { onConflict: 'id' });

          if (sectionError) {
            results.errors.push(`Sections batch: ${sectionError.message}`);
          } else {
            results.sections = sectionRows.length;
          }
        }
      } else {
        results.errors.push(`Categories API: HTTP ${catResponse.status}`);
      }
    } catch (error: any) {
      results.errors.push(`Categories: ${error.message}`);
    }

    // 2. Sync Products (batch upsert)
    try {
      const prodResponse = await fetch(`${baseUrl}/v1/products`, { headers });
      if (prodResponse.ok) {
        const prodData = await prodResponse.json();
        const products = prodData.products || [];

        // Group products by category_title for service_provider grouping
        const categoryGroups = new Map<string, { products: any[], categoryId: number }>();
        for (const prod of products) {
          const key = String(prod.category_id);
          if (!categoryGroups.has(key)) {
            categoryGroups.set(key, { products: [], categoryId: prod.category_id });
          }
          categoryGroups.get(key)!.products.push(prod);
        }

        // Create service_providers for each category group
        for (const [catId, group] of categoryGroups) {
          const sectionSlug = `g2bulk-${catId}`;
          const catTitle = group.products[0]?.category_title || `Category ${catId}`;

          // Upsert a single service_provider per category
          const { data: spData, error: spError } = await supabase
            .from('service_providers')
            .upsert({
              name: catTitle,
              name_en: catTitle,
              description: `Products from ${catTitle}`,
              section_id: sectionSlug,
              api_product_id: `cat-${catId}`, // Use category ID as the group key
              api_provider_id: providerId,
              is_active: true,
              sort_order: parseInt(catId) || 0,
              execution_type: 'api',
            }, { onConflict: 'api_provider_id,api_product_id', ignoreDuplicates: false })
            .select('id')
            .single();

          if (spError || !spData) {
            // Try to find existing
            const { data: existing } = await supabase
              .from('service_providers')
              .select('id')
              .eq('api_provider_id', providerId)
              .eq('api_product_id', `cat-${catId}`)
              .single();

            if (existing) {
              // Upsert packages for this provider
              const pkgRows = group.products.map((prod: any) => ({
                provider_id: existing.id,
                name: prod.title,
                name_en: prod.title,
                description: prod.description || '',
                price_usd: prod.unit_price,
                price_yer: 0,
                price_sar: 0,
                cost_price: prod.unit_price,
                cost_currency: 'USD',
                execution_type: 'api' as const,
                api_product_id: String(prod.id),
                is_active: true,
              }));

              if (pkgRows.length > 0) {
                const { error: pkgError } = await supabase
                  .from('product_packages')
                  .upsert(pkgRows, { onConflict: 'provider_id,api_product_id' });
                if (pkgError) {
                  results.errors.push(`Packages for cat ${catId}: ${pkgError.message}`);
                }
              }
              results.products += group.products.length;
            }
            continue;
          }

          // Upsert packages for this provider
          const pkgRows = group.products.map((prod: any) => ({
            provider_id: spData.id,
            name: prod.title,
            name_en: prod.title,
            description: prod.description || '',
            price_usd: prod.unit_price,
            price_yer: 0,
            price_sar: 0,
            cost_price: prod.unit_price,
            cost_currency: 'USD',
            execution_type: 'api' as const,
            api_product_id: String(prod.id),
            is_active: true,
          }));

          if (pkgRows.length > 0) {
            const { error: pkgError } = await supabase
              .from('product_packages')
              .upsert(pkgRows, { onConflict: 'provider_id,api_product_id' });
            if (pkgError) {
              results.errors.push(`Packages for cat ${catId}: ${pkgError.message}`);
            }
          }
          results.products += group.products.length;
        }
      } else {
        results.errors.push(`Products API: HTTP ${prodResponse.status}`);
      }
    } catch (error: any) {
      results.errors.push(`Products: ${error.message}`);
    }

    // 3. Sync Games (batch upsert)
    try {
      const gamesResponse = await fetch(`${baseUrl}/v1/games`, { headers });
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        const games = gamesData.games || [];

        // Batch upsert games as api_categories
        const gameRows = games.map((game: any) => ({
          api_provider_id: providerId,
          api_category_id: `game_${game.code}`,
          title: game.name,
          title_en: game.name,
          description: `Game: ${game.name}`,
          image_url: game.image_url || '',
          is_active: true,
          is_synced: true,
          last_synced_at: new Date().toISOString(),
        }));

        if (gameRows.length > 0) {
          const { error: gameError } = await supabase
            .from('api_categories')
            .upsert(gameRows, { onConflict: 'api_provider_id,api_category_id' });

          if (gameError) {
            results.errors.push(`Games batch: ${gameError.message}`);
          }
          results.games = gameRows.length;
        }

        // Create games section
        const { error: sectionError } = await supabase
          .from('sections')
          .upsert({
            id: `g2bulk-games-${providerId}`,
            name: 'الألعاب',
            name_en: 'Games',
            description: 'شحن الألعاب والمزيد',
            type: 'api' as const,
            api_provider_id: providerId,
            is_active: true,
            sort_order: 900,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (sectionError) {
          results.errors.push(`Games section: ${sectionError.message}`);
        } else {
          results.sections++;
        }
      } else {
        results.errors.push(`Games API: HTTP ${gamesResponse.status}`);
      }
    } catch (error: any) {
      results.errors.push(`Games: ${error.message}`);
    }

    // Update last sync timestamp
    if (providerData && providerData.length > 0) {
      await supabase
        .from('api_providers')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', providerData[0].id);
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.categories} categories, ${results.products} products, ${results.games} games, ${results.sections} sections`,
      ...results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
