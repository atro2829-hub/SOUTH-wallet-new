// API Providers Service - محفظة الجنوب
// Multi-provider support for game top-up, digital products, and services
// Currently supports G2Bulk with extensible architecture for more providers

import { get, ref, update, push, set, onValue, off } from 'firebase/database';
import { database } from './firebase';

// ===== Types =====

export interface ApiProvider {
  id: string;
  name: string;
  nameAr: string;
  type: 'g2bulk' | 'custom';
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  markupPercent: number;
  supportsProducts: boolean;
  supportsGames: boolean;
  lastSync: string | null;
  balance: number;
  balanceCurrency: string;
  description: string;
  descriptionAr: string;
  logo: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  // Custom headers for other APIs
  authHeaderName: string; // e.g., 'X-API-Key', 'Authorization', 'Bearer'
  authHeaderPrefix: string; // e.g., '', 'Bearer ', 'Key '
}

export interface ApiCategory {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  product_count: number;
  provider_id: string;
  enabled: boolean;
  custom_name?: string;
  custom_nameAr?: string;
}

export interface ApiProduct {
  id: number;
  title: string;
  description: string;
  category_id: number;
  category_title: string;
  unit_price: number;
  image_url: string | null;
  stock: number;
  provider_id: string;
  enabled: boolean;
  custom_price?: number;
  markupPercent?: number;
}

export interface ApiGame {
  id: number;
  code: string;
  name: string;
  image_url: string;
  provider_id: string;
  enabled: boolean;
}

export interface ApiGameCatalogue {
  id: number;
  name: string;
  amount: number;
  provider_id: string;
}

export interface ApiGameFields {
  fields: string[];
  notes: string;
}

export interface ApiGameServer {
  [regionName: string]: string;
}

export interface PurchaseResult {
  success: boolean;
  order_id?: number;
  transaction_id?: number;
  product_id?: number;
  product_title?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  delivery_items?: string[] | null;
  poll_url?: string | null;
  message?: string;
}

export interface GameOrderResult {
  success: boolean;
  message: string;
  order: {
    order_id: number;
    game: string;
    catalogue: string;
    player_id: string;
    player_name?: string;
    price: number;
    status: string;
    callback_url?: string;
  };
}

export interface OrderStatus {
  order_id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  delivery_items?: string[] | null;
  message?: string;
}

export interface ProviderBalance {
  success: boolean;
  user_id?: number;
  username?: string;
  balance: number;
  currency?: string;
}

// ===== Provider CRUD =====

export async function getApiProviders(): Promise<ApiProvider[]> {
  const snapshot = await get(ref(database, 'apiProviders'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data).map(([id, val]: [string, any]) => ({
    id,
    ...val,
  })) as ApiProvider[];
}

export async function getApiProvider(providerId: string): Promise<ApiProvider | null> {
  const snapshot = await get(ref(database, `apiProviders/${providerId}`));
  if (!snapshot.exists()) return null;
  return { id: providerId, ...snapshot.val() } as ApiProvider;
}

export async function saveApiProvider(provider: Partial<ApiProvider> & { name: string }): Promise<string> {
  const existingProviders = await getApiProviders();
  // Check if a provider with same name exists
  const existing = existingProviders.find(p => p.name === provider.name && p.id !== provider.id);
  if (existing && !provider.id) {
    // Update existing
    const updates: Record<string, any> = {};
    Object.entries(provider).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates[`apiProviders/${existing.id}/${key}`] = value;
      }
    });
    updates[`apiProviders/${existing.id}/updatedAt`] = new Date().toISOString();
    await update(ref(database), updates);
    return existing.id;
  }

  if (provider.id) {
    // Update existing provider
    const updates: Record<string, any> = {};
    Object.entries(provider).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates[`apiProviders/${provider.id}/${key}`] = value;
      }
    });
    updates[`apiProviders/${provider.id}/updatedAt`] = new Date().toISOString();
    await update(ref(database), updates);
    return provider.id;
  } else {
    // Create new provider
    const newRef = push(ref(database, 'apiProviders'));
    const id = newRef.key!;
    const now = new Date().toISOString();
    await set(newRef, {
      name: provider.name,
      nameAr: provider.nameAr || provider.name,
      type: provider.type || 'custom',
      apiKey: provider.apiKey || '',
      baseUrl: provider.baseUrl || '',
      enabled: provider.enabled ?? true,
      markupPercent: provider.markupPercent || 0,
      supportsProducts: provider.supportsProducts ?? true,
      supportsGames: provider.supportsGames ?? true,
      lastSync: null,
      balance: 0,
      balanceCurrency: 'USD',
      description: provider.description || '',
      descriptionAr: provider.descriptionAr || '',
      logo: provider.logo || '',
      color: provider.color || '#8B1E3A',
      authHeaderName: provider.authHeaderName || 'X-API-Key',
      authHeaderPrefix: provider.authHeaderPrefix || '',
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }
}

export async function deleteApiProvider(providerId: string): Promise<void> {
  await set(ref(database, `apiProviders/${providerId}`), null);
  // Also clean up cached data
  await set(ref(database, `apiProviderCache/${providerId}`), null);
}

export async function toggleApiProvider(providerId: string, enabled: boolean): Promise<void> {
  await update(ref(database, `apiProviders/${providerId}`), {
    enabled,
    updatedAt: new Date().toISOString(),
  });
}

// ===== Generic API Request =====

async function apiRequest<T>(
  provider: ApiProvider,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const headerName = provider.authHeaderName || 'X-API-Key';
  const headerPrefix = provider.authHeaderPrefix || '';

  const headers: Record<string, string> = {
    [headerName]: `${headerPrefix}${provider.apiKey}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = { method, headers };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const baseUrl = provider.baseUrl.replace(/\/$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.success === false) {
    throw new Error(data.message || data.detail?.message || 'API request failed');
  }
  return data as T;
}

// ===== G2Bulk Specific Functions =====

export async function getG2BulkBalance(provider: ApiProvider): Promise<ProviderBalance> {
  const data = await apiRequest<any>(provider, '/v1/getMe');
  return {
    success: data.success,
    user_id: data.user_id,
    username: data.username,
    balance: data.balance,
    currency: 'USD',
  };
}

export async function syncG2BulkCategories(provider: ApiProvider): Promise<ApiCategory[]> {
  const data = await apiRequest<{ success: boolean; categories: any[] }>(provider, '/v1/category');
  const categories: ApiCategory[] = (data.categories || []).map((cat: any) => ({
    id: cat.id,
    title: cat.title,
    description: cat.description || '',
    image_url: cat.image_url || null,
    product_count: cat.product_count || 0,
    provider_id: provider.id,
    enabled: true,
  }));

  // Cache to Firebase
  const cacheUpdates: Record<string, any> = {};
  categories.forEach((cat) => {
    cacheUpdates[`apiProviderCache/${provider.id}/categories/${cat.id}`] = cat;
  });
  cacheUpdates[`apiProviders/${provider.id}/lastSync`] = new Date().toISOString();
  await update(ref(database), cacheUpdates);

  return categories;
}

export async function syncG2BulkProducts(provider: ApiProvider): Promise<ApiProduct[]> {
  const data = await apiRequest<{ success: boolean; products: any[] }>(provider, '/v1/products');
  const products: ApiProduct[] = (data.products || []).map((prod: any) => ({
    id: prod.id,
    title: prod.title,
    description: prod.description || '',
    category_id: prod.category_id,
    category_title: prod.category_title || '',
    unit_price: prod.unit_price,
    image_url: prod.image_url || null,
    stock: prod.stock || 0,
    provider_id: provider.id,
    enabled: true,
  }));

  // Cache to Firebase
  const cacheUpdates: Record<string, any> = {};
  products.forEach((prod) => {
    cacheUpdates[`apiProviderCache/${provider.id}/products/${prod.id}`] = prod;
  });
  cacheUpdates[`apiProviders/${provider.id}/lastSync`] = new Date().toISOString();
  await update(ref(database), cacheUpdates);

  return products;
}

export async function syncG2BulkGames(provider: ApiProvider): Promise<ApiGame[]> {
  const data = await apiRequest<{ success: boolean; games: any[] }>(provider, '/v1/games');
  const games: ApiGame[] = (data.games || []).map((game: any) => ({
    id: game.id,
    code: game.code,
    name: game.name,
    image_url: game.image_url || '',
    provider_id: provider.id,
    enabled: true,
  }));

  // Cache to Firebase
  const cacheUpdates: Record<string, any> = {};
  games.forEach((game) => {
    cacheUpdates[`apiProviderCache/${provider.id}/games/${game.code}`] = game;
  });
  cacheUpdates[`apiProviders/${provider.id}/lastSync`] = new Date().toISOString();
  await update(ref(database), cacheUpdates);

  return games;
}

export async function fullG2BulkSync(provider: ApiProvider): Promise<{
  categories: number;
  products: number;
  games: number;
}> {
  const [categories, products, games] = await Promise.all([
    syncG2BulkCategories(provider),
    syncG2BulkProducts(provider),
    syncG2BulkGames(provider),
  ]);
  return {
    categories: categories.length,
    products: products.length,
    games: games.length,
  };
}

// ===== Game Top-up Functions =====

export async function getGameFields(provider: ApiProvider, gameCode: string): Promise<ApiGameFields> {
  const data = await apiRequest<any>(provider, '/v1/games/fields', 'POST', { game: gameCode });
  return {
    fields: data.info?.fields || data.fields || [],
    notes: data.info?.notes || data.notes || '',
  };
}

export async function getGameServers(provider: ApiProvider, gameCode: string): Promise<ApiGameServer> {
  try {
    const data = await apiRequest<any>(provider, '/v1/games/servers', 'POST', { game: gameCode });
    return data.servers || {};
  } catch (error: any) {
    // 403 means no servers required - not an error
    if (error.message?.includes('403') || error.message?.includes('does not require')) {
      return {};
    }
    throw error;
  }
}

export async function checkPlayerId(
  provider: ApiProvider,
  gameCode: string,
  userId: string,
  serverId?: string,
  charname?: string
): Promise<{ valid: boolean; name?: string; openid?: string }> {
  const body: Record<string, any> = { game: gameCode, user_id: userId };
  if (serverId) body.server_id = serverId;
  if (charname) body.charname = charname;

  const data = await apiRequest<any>(provider, '/v1/games/checkPlayerId', 'POST', body);
  return {
    valid: data.valid === 'valid',
    name: data.name,
    openid: data.openid,
  };
}

export async function getGameCatalogue(provider: ApiProvider, gameCode: string): Promise<ApiGameCatalogue[]> {
  const data = await apiRequest<{ success: boolean; catalogues: any[] }>(provider, `/v1/games/${gameCode}/catalogue`);
  return (data.catalogues || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    amount: cat.amount,
    provider_id: provider.id,
  }));
}

export async function placeGameOrder(
  provider: ApiProvider,
  gameCode: string,
  catalogueName: string,
  playerId: string,
  serverId?: string,
  charname?: string,
  remark?: string
): Promise<GameOrderResult> {
  const body: Record<string, any> = {
    catalogue_name: catalogueName,
    player_id: playerId,
  };
  if (serverId) body.server_id = serverId;
  if (charname) body.charname = charname;
  if (remark) body.remark = remark;

  return apiRequest<GameOrderResult>(provider, `/v1/games/${gameCode}/order`, 'POST', body);
}

export async function checkGameOrderStatus(
  provider: ApiProvider,
  orderId: number,
  gameCode: string
): Promise<OrderStatus> {
  const data = await apiRequest<any>(provider, '/v1/games/order/status', 'POST', {
    order_id: orderId,
    game: gameCode,
  });
  return {
    order_id: orderId,
    status: data.order?.status || data.status,
    delivery_items: data.order?.delivery_items || data.delivery_items,
    message: data.order?.message || data.message,
  };
}

// ===== Product Purchase Functions =====

export async function purchaseProduct(
  provider: ApiProvider,
  productId: number,
  quantity: number = 1
): Promise<PurchaseResult> {
  return apiRequest<PurchaseResult>(provider, `/v1/products/${productId}/purchase`, 'POST', { quantity });
}

export async function checkOrderDelivery(
  provider: ApiProvider,
  orderId: number
): Promise<PurchaseResult> {
  return apiRequest<PurchaseResult>(provider, `/v1/orders/${orderId}/delivery`);
}

export async function getOrderHistory(
  provider: ApiProvider,
  page: number = 1,
  limit: number = 50
): Promise<any> {
  return apiRequest<any>(provider, `/v1/orders?page=${page}&limit=${limit}`);
}

// ===== Cached Data Access =====

export function subscribeToProviderCache(
  providerId: string,
  callback: (data: {
    categories: ApiCategory[];
    products: ApiProduct[];
    games: ApiGame[];
  }) => void
): () => void {
  const cacheRef = ref(database, `apiProviderCache/${providerId}`);
  const unsub = onValue(cacheRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({ categories: [], products: [], games: [] });
      return;
    }
    const data = snapshot.val();
    const categories = data.categories ? Object.values(data.categories) as ApiCategory[] : [];
    const products = data.products ? Object.values(data.products) as ApiProduct[] : [];
    const games = data.games ? Object.values(data.games) as ApiGame[] : [];
    callback({ categories, products, games });
  });
  return () => off(cacheRef);
}

export async function getCachedProviderData(providerId: string): Promise<{
  categories: ApiCategory[];
  products: ApiProduct[];
  games: ApiGame[];
}> {
  const snapshot = await get(ref(database, `apiProviderCache/${providerId}`));
  if (!snapshot.exists()) return { categories: [], products: [], games: [] };
  const data = snapshot.val();
  return {
    categories: data.categories ? Object.values(data.categories) as ApiCategory[] : [],
    products: data.products ? Object.values(data.products) as ApiProduct[] : [],
    games: data.games ? Object.values(data.games) as ApiGame[] : [],
  };
}

// ===== Test Provider Connection =====

export async function testProviderConnection(provider: ApiProvider): Promise<{
  success: boolean;
  balance?: number;
  username?: string;
  error?: string;
}> {
  try {
    const balance = await getG2BulkBalance(provider);
    return {
      success: true,
      balance: balance.balance,
      username: balance.username,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== Initialize Default G2Bulk Provider =====

export async function initializeDefaultProviders(): Promise<void> {
  const providers = await getApiProviders();
  const g2bulkExists = providers.some(p => p.type === 'g2bulk');

  if (!g2bulkExists) {
    await saveApiProvider({
      name: 'G2Bulk',
      nameAr: 'G2Bulk',
      type: 'g2bulk',
      apiKey: '4882984fe50f9038432b21e5fb37ecbf38a029c40a45c73f27da374ac933bd45',
      baseUrl: 'https://api.g2bulk.com',
      enabled: true,
      markupPercent: 3,
      supportsProducts: true,
      supportsGames: true,
      description: 'Digital products and game top-up provider',
      descriptionAr: 'مزود منتجات رقمية وشحن ألعاب',
      logo: '',
      color: '#8B1E3A',
      authHeaderName: 'X-API-Key',
      authHeaderPrefix: '',
    });
  }
}
