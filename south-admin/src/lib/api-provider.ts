/**
 * API Provider Integration Module (Admin)
 * 
 * Handles testing API connections, executing orders via external APIs,
 * managing API provider configurations stored in Firebase RTDB,
 * and G2Bulk v1 API integration for the admin app.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ─────────────────────────────────────────────────────────────

export interface ApiProviderConfig {
  id: string;
  name: string;           // Arabic display name
  baseUrl: string;        // API Base URL
  apiKey: string;         // API Key
  apiSecret?: string;     // API Secret (if needed)
  authHeader?: string;    // Auth header name (e.g. "X-API-Key", "Authorization")
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  bodyTemplate?: string;  // JSON template with placeholders
  responseFormat: 'json' | 'xml';
  fieldMappings?: {
    statusField: string;
    successValue: string;
    balanceField?: string;
    messageField?: string;
    transactionIdField?: string;
    errorCodeField?: string;
  };
  isActive: boolean;
  syncEnabled: boolean;
  lastSync?: string;
  createdAt: string;
  sectionName?: string;
  sectionId?: string;
  sectionIcon?: string;
  icon?: string;
  categories?: Record<string, ApiProviderCategory>;
}

export interface ApiProviderCategory {
  id: number | string;
  title: string;
  icon?: string;
  slug?: string;
  products?: Record<string, ApiProviderProduct>;
}

export interface ApiProviderProduct {
  id: number | string;
  title: string;
  unit_price: number;
  stock?: number;
  icon?: string;
  description?: string;
  input_label?: string;
  input_type?: string;
  category_id?: number | string;
  isActive?: boolean;
}

export interface ApiTestResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  rawResponse?: string;
  parsedResponse?: any;
  availableFields: string[];
  error?: string;
  mappedValues?: {
    status?: string;
    balance?: string;
    message?: string;
    transactionId?: string;
  };
}

export interface ApiOrderResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  balance?: string;
  rawResponse?: any;
  error?: string;
}

export interface G2BulkCategory {
  id: number;
  title: string;
  icon: string;
  slug: string;
}

export interface G2BulkProduct {
  id: number;
  title: string;
  unit_price: number;
  stock: number;
  icon: string;
  description?: string;
  category_id: number;
}

// ─── Helper: Get nested value from object by dot path ──────────────────

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

// ─── Helper: Extract all field paths from an object ────────────────────

function extractFieldPaths(obj: any, prefix: string = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...extractFieldPaths(value, fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

// ─── Helper: Replace template placeholders ─────────────────────────────

function replaceTemplatePlaceholders(
  template: string,
  data: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return result;
}

// ─── Helper: Build auth headers for any provider ───────────────────────

function buildAuthHeaders(config: { apiKey: string; authHeader?: string; headers?: Record<string, string> }): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.headers || {}),
  };
  
  if (config.apiKey) {
    const authHeaderName = config.authHeader || 'X-API-Key';
    if (authHeaderName.toLowerCase() === 'authorization') {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else {
      headers[authHeaderName] = config.apiKey;
    }
  }
  
  return headers;
}

// ─── G2Bulk / Provider API Functions ───────────────────────────────────

export async function fetchProviderBalance(config: ApiProviderConfig): Promise<{ balance: number; currency: string } | null> {
  try {
    const headers = buildAuthHeaders(config);
    const response = await fetch(`${config.baseUrl}getMe`, { headers });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.data) {
      return {
        balance: data.data.balance || 0,
        currency: data.data.currency || 'USD',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchProviderCategories(config: ApiProviderConfig): Promise<G2BulkCategory[]> {
  try {
    const headers = buildAuthHeaders(config);
    const response = await fetch(`${config.baseUrl}category`, { headers });
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.categories)) return data.categories;
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

export async function fetchProviderProducts(config: ApiProviderConfig, categoryId: number | string): Promise<G2BulkProduct[]> {
  try {
    const headers = buildAuthHeaders(config);
    const response = await fetch(`${config.baseUrl}products?category_id=${categoryId}`, { headers });
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

export async function fetchAllProviderProducts(config: ApiProviderConfig): Promise<G2BulkProduct[]> {
  try {
    const headers = buildAuthHeaders(config);
    const response = await fetch(`${config.baseUrl}products`, { headers });
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

export async function purchaseProviderProduct(
  config: ApiProviderConfig,
  productId: number | string,
  customerId: string,
  quantity?: number
): Promise<ApiOrderResult> {
  try {
    const headers = buildAuthHeaders(config);
    const body: any = {
      product_id: Number(productId),
      customer_id: customerId,
    };
    if (quantity) body.quantity = quantity;
    
    const response = await fetch(`${config.baseUrl}products/${productId}/purchase`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    const isSuccess = data.status === 'success' || data.status === '1' || response.ok;
    
    return {
      success: isSuccess,
      transactionId: data.data?.id ? String(data.data.id) : data.order_id,
      message: data.message || (isSuccess ? 'تم الشراء بنجاح' : 'فشل الشراء'),
      rawResponse: data,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'API call failed' };
  }
}

export async function checkProviderOrderStatus(
  config: ApiProviderConfig,
  orderId: number | string
): Promise<ApiOrderResult> {
  try {
    const headers = buildAuthHeaders(config);
    const response = await fetch(`${config.baseUrl}orders/${orderId}/delivery`, { headers });
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    const isSuccess = data.status === 'success' || data.data?.status === 'delivered';
    return {
      success: isSuccess,
      transactionId: String(orderId),
      message: data.message || data.data?.status || '',
      rawResponse: data,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'API call failed' };
  }
}

export async function fetchProviderOrders(config: ApiProviderConfig): Promise<any[]> {
  try {
    const headers = buildAuthHeaders(config);
    const response = await fetch(`${config.baseUrl}orders`, { headers });
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.orders)) return data.orders;
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

// ─── Test API Connection ───────────────────────────────────────────────

export async function testApiConnection(
  config: Omit<ApiProviderConfig, 'id' | 'isActive' | 'createdAt'>
): Promise<ApiTestResult> {
  const startTime = Date.now();
  
  try {
    const headers = buildAuthHeaders(config);
    const requestOptions: RequestInit = {
      method: config.method,
      headers,
    };
    
    if (config.method === 'POST' && config.bodyTemplate) {
      const testBody = replaceTemplatePlaceholders(config.bodyTemplate, {
        customerId: 'test_user_123',
        packageId: 'test_pkg_001',
        amount: '100',
        currency: 'YER',
        phone: '967770001234',
        apiSecret: config.apiSecret || '',
        apiKey: config.apiKey || '',
      });
      requestOptions.body = testBody;
    }
    
    const testUrl = config.baseUrl.endsWith('/') 
      ? `${config.baseUrl}getMe` 
      : config.baseUrl;
    
    const response = await fetch(testUrl, requestOptions);
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    let parsedResponse: any = null;
    let availableFields: string[] = [];
    
    if (config.responseFormat === 'json') {
      try {
        parsedResponse = JSON.parse(responseText);
        availableFields = extractFieldPaths(parsedResponse);
      } catch {
        parsedResponse = { raw: responseText };
        availableFields = ['raw'];
      }
    } else {
      parsedResponse = { raw: responseText, format: 'xml' };
      availableFields = ['raw', 'format'];
    }
    
    const mappedValues: ApiTestResult['mappedValues'] = {};
    if (config.fieldMappings) {
      if (config.fieldMappings.statusField) {
        mappedValues.status = String(getNestedValue(parsedResponse, config.fieldMappings.statusField) ?? '');
      }
      if (config.fieldMappings.balanceField) {
        mappedValues.balance = String(getNestedValue(parsedResponse, config.fieldMappings.balanceField) ?? '');
      }
      if (config.fieldMappings.messageField) {
        mappedValues.message = String(getNestedValue(parsedResponse, config.fieldMappings.messageField) ?? '');
      }
      if (config.fieldMappings.transactionIdField) {
        mappedValues.transactionId = String(getNestedValue(parsedResponse, config.fieldMappings.transactionIdField) ?? '');
      }
    }
    
    return {
      success: response.ok,
      statusCode: response.status,
      responseTime,
      rawResponse: responseText,
      parsedResponse,
      availableFields,
      mappedValues: Object.keys(mappedValues).length > 0 ? mappedValues : undefined,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: error.message || 'Unknown error occurred',
      availableFields: [],
    };
  }
}

// ─── Execute Order via API ─────────────────────────────────────────────

export async function executeApiOrder(
  config: ApiProviderConfig,
  orderData: {
    customerId: string;
    packageId: string;
    amount: number;
    currency: string;
    phone?: string;
    playerName?: string;
  }
): Promise<ApiOrderResult> {
  try {
    const headers = buildAuthHeaders(config);
    const requestOptions: RequestInit = {
      method: config.method,
      headers,
    };
    
    if (config.method === 'POST' && config.bodyTemplate) {
      const body = replaceTemplatePlaceholders(config.bodyTemplate, {
        customerId: orderData.customerId,
        packageId: orderData.packageId,
        amount: orderData.amount,
        currency: orderData.currency,
        phone: orderData.phone || '',
        playerName: orderData.playerName || '',
        apiSecret: config.apiSecret || '',
        apiKey: config.apiKey || '',
      });
      requestOptions.body = body;
    } else if (config.method === 'GET') {
      const url = replaceTemplatePlaceholders(config.baseUrl, {
        customerId: orderData.customerId,
        packageId: orderData.packageId,
        amount: String(orderData.amount),
        currency: orderData.currency,
        phone: orderData.phone || '',
        playerName: orderData.playerName || '',
      });
      const response = await fetch(url, requestOptions);
      return await processApiResponse(response, config);
    }
    
    const response = await fetch(config.baseUrl, requestOptions);
    return await processApiResponse(response, config);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'API call failed',
    };
  }
}

async function processApiResponse(
  response: Response,
  config: ApiProviderConfig
): Promise<ApiOrderResult> {
  const responseText = await response.text();
  let parsed: any = null;
  try {
    if (config.responseFormat === 'json') {
      parsed = JSON.parse(responseText);
    } else {
      parsed = { raw: responseText };
    }
  } catch {
    parsed = { raw: responseText };
  }
  
  const mappings = config.fieldMappings;
  if (mappings) {
    const statusValue = String(getNestedValue(parsed, mappings.statusField) ?? '');
    const isSuccess = statusValue === mappings.successValue ||
      statusValue.toLowerCase() === mappings.successValue.toLowerCase();
    
    const message = mappings.messageField
      ? String(getNestedValue(parsed, mappings.messageField) ?? '')
      : '';
    const transactionId = mappings.transactionIdField
      ? String(getNestedValue(parsed, mappings.transactionIdField) ?? '')
      : '';
    const balance = mappings.balanceField
      ? String(getNestedValue(parsed, mappings.balanceField) ?? '')
      : '';
    
    return {
      success: isSuccess,
      transactionId,
      message,
      balance,
      rawResponse: parsed,
    };
  }
  
  return {
    success: response.ok,
    message: response.ok ? 'Request succeeded' : `HTTP ${response.status}`,
    rawResponse: parsed,
  };
}

export function generateApiProviderId(): string {
  return `api-provider-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ─── Sync provider categories and products to Firebase ─────────────────
// Now also writes to sections/ and providers/ paths for user app compatibility

export async function syncProviderToFirebase(
  config: ApiProviderConfig,
  database: any,
  refFn: (...args: any[]) => any,
  updateFn: (...args: any[]) => Promise<any>
): Promise<{ categoriesCount: number; productsCount: number }> {
  const categories = await fetchProviderCategories(config);
  if (categories.length === 0) {
    return { categoriesCount: 0, productsCount: 0 };
  }

  const allProducts = await fetchAllProviderProducts(config);

  const updates: Record<string, any> = {};
  let totalProducts = 0;

  // Determine the section ID for this provider
  const sectionId = config.sectionId || 'service-providers';
  const providerId = config.id;

  // ─── Write categories to adminSettings/apiProviders/{id}/categories (existing) ───
  for (const category of categories) {
    const catKey = String(category.id);
    const catProducts = allProducts.filter(p => p.category_id === category.id);
    
    // Use 'prod_' prefix to prevent Firebase from converting numeric keys to array indices
    const productsMap: Record<string, any> = {};
    for (const product of catProducts) {
      productsMap[`prod_${product.id}`] = {
        id: product.id,
        title: product.title,
        unit_price: product.unit_price,
        stock: product.stock || 0,
        icon: product.icon || '',
        description: product.description || '',
        category_id: product.category_id,
        isActive: true,
      };
      totalProducts++;
    }

    // Use 'cat_' prefix to prevent Firebase from converting numeric keys to array indices
    updates[`adminSettings/apiProviders/${config.id}/categories/cat_${catKey}`] = {
      id: category.id,
      title: category.title,
      icon: category.icon || '',
      slug: category.slug || '',
      products: productsMap,
    };

    // ─── Also create provider entry in providers/ for user app ───
    const providerEntryId = `${providerId}-${catKey}`;
    updates[`providers/${providerEntryId}`] = {
      id: providerEntryId,
      name: category.title,
      color: '#9333EA',
      icon: category.icon || '',
      categoryId: catKey,
      sectionId: sectionId,
      subSectionId: providerId,
      inputLabel: 'معرف العميل',
      inputType: 'text',
      isActive: true,
      sortOrder: 0,
      apiProviderId: providerId,
      apiCategoryId: catKey,
    };

    // ─── Also create package entries in packages/ for each product ───
    for (const product of catProducts) {
      const pkgId = `${providerId}-prod-${product.id}`;
      updates[`packages/${pkgId}`] = {
        id: pkgId,
        name: product.title,
        price: product.unit_price,
        currency: 'USD',
        costPrice: product.unit_price,
        commission: 0,
        commissionType: 'percentage',
        executionType: 'auto',
        apiProviderId: providerId,
        apiProductId: String(product.id),
        providerId: providerEntryId,
        categoryId: catKey,
        sectionId: sectionId,
        subSectionId: providerId,
        icon: product.icon || '',
        description: product.description || '',
        isActive: true,
        sortOrder: 0,
      };
    }
  }

  // ─── Create/update sub-section under the parent section in sections/ ───
  updates[`sections/${sectionId}/subSections/${providerId}`] = {
    id: providerId,
    name: config.name,
    icon: config.icon || '',
    isActive: true,
    parentId: sectionId,
    sortOrder: 0,
    apiProviderId: providerId,
  };

  // Make sure the parent section has the provider reference
  updates[`sections/${sectionId}/providerIds`] = null; // Will be rebuilt if needed

  updates[`adminSettings/apiProviders/${config.id}/lastSync`] = new Date().toISOString();

  await updateFn(refFn(database), updates);

  return { categoriesCount: categories.length, productsCount: totalProducts };
}
