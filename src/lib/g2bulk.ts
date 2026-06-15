// G2Bulk API Service - DEPRECATED
// This file is kept for backward compatibility only
// All G2Bulk functionality is now handled via api-providers.ts
// which supports multiple API providers including G2Bulk

export { getApiProvider, getG2BulkBalance as checkG2BulkBalance, syncG2BulkCategories as getG2BulkCategories, syncG2BulkProducts as getG2BulkProducts, purchaseProduct as purchaseG2BulkProduct, checkOrderDelivery as checkG2BulkOrder, testProviderConnection as testG2BulkConnection, } from './api-providers';
export type { ApiCategory as G2BulkCategory, ApiProduct as G2BulkProduct, PurchaseResult as G2BulkPurchaseResult, ProviderBalance as G2BulkBalance, } from './api-providers';
