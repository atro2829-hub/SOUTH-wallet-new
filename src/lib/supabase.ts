/**
 * Supabase Client for South Wallet - PRIMARY DATA SOURCE
 *
 * Supabase handles: ALL data (users, transactions, orders, sections, providers, etc.)
 * The service_role key (sbp_...) is used for admin/server-side operations.
 * The anon key is used for client-side operations with RLS policies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifmxseonkdsxuanznny.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk3NzAsImV4cCI6MjA5NzA0NTc3MH0.4KbBtMruP_xrPiHe_XtcoHG7NVQhlflhUUkJFWgQxkM';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Standard client with anon key (respects RLS policies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Admin client with service_role key (bypasses RLS - use with caution)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface DbUser {
  id: string;
  firebase_uid: string | null;
  email: string | null;
  phone: string | null;
  first_name: string;
  second_name: string;
  third_name: string;
  family_name: string;
  display_name: string;
  balance_yer: number;
  balance_sar: number;
  balance_usd: number;
  card_type: string;
  card_number: string;
  national_id: string;
  governorate: string;
  avatar_url: string;
  role: 'user' | 'admin' | 'owner' | 'agent';
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected';
  is_blocked: boolean;
  is_active: boolean;
  id_front_url: string;
  id_back_url: string;
  id_selfie_url: string;
  id_verified_at: string | null;
  id_rejection_reason: string;
  fcm_token: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  pin_code: string;
  login_attempts: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  fee: number;
  fee_currency: string;
  type: 'transfer' | 'deposit' | 'withdraw' | 'order' | 'recharge' | 'exchange' | 'gift' | 'promo' | 'commission' | 'refund' | 'investment';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description: string;
  reference_number: string;
  receipt_data: Record<string, unknown>;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_card_number: string;
  api_provider_id: string;
  api_order_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DbOrder {
  id: string;
  user_id: string;
  provider_id: string;
  provider_name: string;
  package_id: string;
  package_name: string;
  category_id: string;
  category_name: string;
  customer_input: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  cost_price: number;
  cost_currency: string;
  commission_amount: number;
  commission_type: string;
  execution_type: 'manual' | 'auto' | 'api';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  api_provider_id: string;
  api_product_id: string;
  api_order_id: string;
  api_response: Record<string, unknown>;
  result_code: string;
  result_message: string;
  result_pin_code: string;
  transaction_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDepositRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: 'bank_transfer' | 'crypto' | 'cash' | 'card' | 'agent';
  bank_name: string;
  bank_account: string;
  sender_name: string;
  transfer_receipt_url: string;
  crypto_network: string;
  crypto_wallet_address: string;
  crypto_tx_hash: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string;
  admin_notes: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: 'bank_transfer' | 'crypto' | 'cash' | 'agent';
  bank_name: string;
  bank_account: string;
  bank_iban: string;
  crypto_network: string;
  crypto_wallet_address: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  rejection_reason: string;
  admin_notes: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  processed_by: string | null;
  processed_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSection {
  id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
  type: 'manual' | 'api' | 'wallet';
  api_provider_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbSubSection {
  id: string;
  section_id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
  type: 'manual' | 'api' | 'wallet';
  api_category_id: string;
  api_provider_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbServiceProvider {
  id: string;
  section_id: string;
  sub_section_id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  input_label: string;
  input_type: 'text' | 'tel' | 'number' | 'email';
  input_prefix: string;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
  type: 'manual' | 'api' | 'wallet';
  api_provider_id: string;
  api_product_id: string;
  execution_type: 'manual' | 'auto' | 'api';
  created_at: string;
  updated_at: string;
}

export interface DbProductPackage {
  id: string;
  provider_id: string;
  name: string;
  name_en: string;
  description: string;
  price_usd: number;
  price_yer: number;
  price_sar: number;
  cost_price: number;
  cost_currency: string;
  commission_amount: number;
  commission_type: string;
  execution_type: 'manual' | 'auto' | 'api';
  api_product_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbApiProvider {
  id: string;
  name: string;
  description: string;
  website: string;
  api_url: string;
  api_key: string;
  auth_header: string;
  auth_type: 'header' | 'bearer' | 'basic' | 'query';
  is_active: boolean;
  balance: number;
  balance_currency: string;
  last_balance_check: string | null;
  default_commission: number;
  commission_type: 'percentage' | 'fixed';
  sync_categories: boolean;
  sync_products: boolean;
  last_sync_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbApiCategory {
  id: string;
  api_provider_id: string;
  api_category_id: string;
  title: string;
  title_en: string;
  description: string;
  image_url: string;
  product_count: number;
  is_active: boolean;
  is_synced: boolean;
  last_synced_at: string | null;
  section_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbExchangeRate {
  id: string;
  usd_to_yer: number;
  usd_to_sar: number;
  sar_to_yer: number;
  source: string;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  position: 'login' | 'home' | 'services' | 'wallet' | 'all';
  link_type: 'none' | 'url' | 'screen' | 'provider' | 'promo';
  link_target: string;
  sort_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  navigation_target: string;
  navigation_params: Record<string, unknown>;
  data: Record<string, unknown>;
  created_at: string;
}

export interface DbWalletAddress {
  id: string;
  network: 'TRC20' | 'ERC20' | 'BEP20' | 'BTC' | 'ETH' | 'SOL' | 'OTHER';
  network_name: string;
  address: string;
  label: string;
  qr_code_url: string;
  is_active: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface DbFeatureFlag {
  flag_key: string;
  is_enabled: boolean;
  description: string;
  updated_at: string;
}

export interface DbBottomNav {
  tab_id: string;
  label: string;
  icon: string;
  is_visible: boolean;
  sort_order: number;
}

export interface DbMaintenance {
  id: string;
  is_active: boolean;
  message: string;
  estimated_time: string;
  activated_at: string | null;
}

export interface DbKillSwitch {
  id: string;
  is_active: boolean;
  message: string;
  activated_at: string | null;
  activated_by: string | null;
  deactivate_at: string | null;
  duration_minutes: number;
}

export interface DbBranding {
  id: string;
  app_name: string;
  app_name_en: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  splash_background: string;
  updated_at: string;
}

export interface DbAppConfig {
  key: string;
  value: Record<string, unknown>;
  description: string;
  updated_at: string;
}

export interface DbEscrowTransaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  reference_code: string;
  status: string;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  funded_at: string | null;
  completed_at: string | null;
  dispute_reason: string;
  created_at: string;
  updated_at: string;
}

export interface DbBranch {
  id: string;
  name: string;
  name_en: string;
  address: string;
  governorate: string;
  phone: string;
  email: string;
  working_hours: string;
  weekend: string;
  latitude: number;
  longitude: number;
  services: string[];
  is_active: boolean;
  sort_order: number;
}

export interface DbUserReview {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  category: string;
  status: string;
  admin_reply: string;
  is_featured: boolean;
  created_at: string;
}

export interface DbPriceOverride {
  id: string;
  target_type: string;
  target_id: string;
  markup_type: string;
  markup_value: number;
  markup_currency: string;
  is_active: boolean;
}

export interface DbCommissionConfig {
  id: string;
  target_type: string;
  target_id: string;
  commission_type: string;
  commission_value: number;
  commission_currency: string;
  is_active: boolean;
}

// Helper: Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && supabaseUrl.includes('.supabase.co');
}

// =====================================================
// SUPABASE SERVICE FUNCTIONS
// =====================================================

export const supabaseService = {
  // --- Users ---
  async getUserById(id: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    return data as DbUser;
  },

  async getUserByFirebaseUid(firebaseUid: string) {
    const { data, error } = await supabase.from('users').select('*').eq('firebase_uid', firebaseUid).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbUser | null;
  },

  async createUser(user: Partial<DbUser> & { id: string }) {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data as DbUser;
  },

  async updateUser(id: string, updates: Partial<DbUser>) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as DbUser;
  },

  /**
   * Ensure a user exists in Supabase. If they don't, create them.
   * If they do, update their info. This keeps Firebase and Supabase in sync.
   * Called on every auth state change so that chat/search features can find users.
   */
  async ensureUser(firebaseUid: string, data: {
    email?: string; phone?: string; displayName?: string;
    firstName?: string; secondName?: string; thirdName?: string; familyName?: string;
    avatar?: string; role?: string; userId?: string;
  }) {
    try {
      const existing = await supabaseService.getUserByFirebaseUid(firebaseUid);

      const userData: Record<string, unknown> = {
        firebase_uid: firebaseUid,
        email: data.email || null,
        phone: data.phone || null,
        display_name: data.displayName || '',
        first_name: data.firstName || '',
        second_name: data.secondName || '',
        third_name: data.thirdName || '',
        family_name: data.familyName || '',
        avatar_url: data.avatar || '',
        role: data.role || 'user',
        is_active: true,
        is_blocked: false,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing user
        await supabase
          .from('users')
          .update(userData)
          .eq('id', existing.id);
      } else {
        // Create new user
        userData.id = crypto.randomUUID();
        userData.kyc_status = 'pending';
        userData.created_at = new Date().toISOString();
        await supabase.from('users').insert(userData);
      }
    } catch (err) {
      console.error('Error ensuring user in Supabase:', err);
    }
  },

  // --- Transactions ---
  async getTransactions(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`user_id.eq.${userId},from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as DbTransaction[];
  },

  async createTransaction(tx: Omit<DbTransaction, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('transactions').insert(tx).select().single();
    if (error) throw error;
    return data as DbTransaction;
  },

  // --- Orders ---
  async getOrders(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as DbOrder[];
  },

  async createOrder(order: Omit<DbOrder, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('orders').insert(order).select().single();
    if (error) throw error;
    return data as DbOrder;
  },

  // --- Deposit Requests ---
  async getDepositRequests(userId: string) {
    const { data, error } = await supabase.from('deposit_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbDepositRequest[];
  },

  async createDepositRequest(req: Omit<DbDepositRequest, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('deposit_requests').insert(req).select().single();
    if (error) throw error;
    return data as DbDepositRequest;
  },

  // --- Withdraw Requests ---
  async getWithdrawRequests(userId: string) {
    const { data, error } = await supabase.from('withdraw_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbWithdrawRequest[];
  },

  async createWithdrawRequest(req: Omit<DbWithdrawRequest, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('withdraw_requests').insert(req).select().single();
    if (error) throw error;
    return data as DbWithdrawRequest;
  },

  // --- Sections ---
  async getSections() {
    const { data, error } = await supabase.from('sections').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbSection[];
  },

  // --- Sub Sections ---
  async getSubSections(sectionId: string) {
    const { data, error } = await supabase.from('sub_sections').select('*').eq('section_id', sectionId).eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbSubSection[];
  },

  // --- Service Providers ---
  async getServiceProviders(sectionId?: string) {
    let query = supabase.from('service_providers').select('*').eq('is_active', true).order('sort_order');
    if (sectionId) query = query.eq('section_id', sectionId);
    const { data, error } = await query;
    if (error) throw error;
    return data as DbServiceProvider[];
  },

  // --- Product Packages ---
  async getProductPackages(providerId: string) {
    const { data, error } = await supabase.from('product_packages').select('*').eq('provider_id', providerId).eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbProductPackage[];
  },

  // --- API Providers ---
  async getApiProviders() {
    const { data, error } = await supabase.from('api_providers').select('*').eq('is_active', true);
    if (error) throw error;
    return data as DbApiProvider[];
  },

  // --- API Categories ---
  async getApiCategories(providerId: string) {
    const { data, error } = await supabase.from('api_categories').select('*').eq('api_provider_id', providerId).eq('is_active', true);
    if (error) throw error;
    return data as DbApiCategory[];
  },

  // --- Exchange Rates ---
  async getExchangeRates() {
    const { data, error } = await supabase.from('exchange_rates').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    if (error) throw error;
    return data[0] as DbExchangeRate | null;
  },

  // --- Banners ---
  async getBanners(position?: string) {
    let query = supabase.from('banners').select('*').eq('is_active', true).order('sort_order');
    if (position) query = query.eq('position', position);
    const { data, error } = await query;
    if (error) throw error;
    return data as DbBanner[];
  },

  // --- Notifications ---
  async getNotifications(userId: string) {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbNotification[];
  },

  async markNotificationRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },

  // --- Wallet Addresses ---
  async getWalletAddresses() {
    const { data, error } = await supabase.from('wallet_addresses').select('*').eq('is_active', true);
    if (error) throw error;
    return data as DbWalletAddress[];
  },

  // --- Feature Flags ---
  async getFeatureFlags() {
    const { data, error } = await supabase.from('feature_flags').select('*');
    if (error) throw error;
    return data as DbFeatureFlag[];
  },

  // --- Bottom Nav ---
  async getBottomNav() {
    const { data, error } = await supabase.from('bottom_nav').select('*').eq('is_visible', true).order('sort_order');
    if (error) throw error;
    return data as DbBottomNav[];
  },

  // --- Maintenance ---
  async getMaintenance() {
    const { data, error } = await supabase.from('maintenance').select('*').eq('id', 'main').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbMaintenance | null;
  },

  // --- Kill Switch ---
  async getKillSwitch() {
    const { data, error } = await supabase.from('kill_switch').select('*').eq('id', 'main').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbKillSwitch | null;
  },

  // --- Branding ---
  async getBranding() {
    const { data, error } = await supabase.from('branding').select('*').eq('id', 'default').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbBranding | null;
  },

  // --- App Config ---
  async getAppConfig(key: string) {
    const { data, error } = await supabase.from('app_config').select('*').eq('key', key).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbAppConfig | null;
  },

  // --- Wallet Services ---
  async getWalletServices() {
    const { data, error } = await supabase.from('wallet_services').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbWalletAddress[];
  },

  // --- Visibility ---
  async getVisibility(targetType: string) {
    const { data, error } = await supabase.from('visibility').select('*').eq('target_type', targetType);
    if (error) throw error;
    return data;
  },

  // --- Card Colors ---
  async getCardColors() {
    const { data, error } = await supabase.from('card_colors').select('*');
    if (error) throw error;
    return data;
  },

  // --- Legal Content ---
  async getLegalContent(id: string) {
    const { data, error } = await supabase.from('legal_content').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // --- Social Links ---
  async getSocialLinks() {
    const { data, error } = await supabase.from('social_links').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data;
  },

  // --- KYC Documents ---
  async submitKycDocument(doc: { user_id: string; document_type: string; document_url: string }) {
    const { data, error } = await supabase.from('kyc_documents').insert(doc).select().single();
    if (error) throw error;
    return data;
  },

  // --- Support Tickets ---
  async createSupportTicket(ticket: { user_id: string; subject: string; category?: string }) {
    const { data, error } = await supabase.from('support_tickets').insert(ticket).select().single();
    if (error) throw error;
    return data;
  },

  // --- Balance Update via RPC (safe, atomic) ---
  async updateBalance(userId: string, currency: string, amount: number, operation: 'add' | 'subtract' = 'add') {
    const { data, error } = await supabase.rpc('update_user_balance', {
      p_user_id: userId,
      p_currency: currency,
      p_amount: amount,
      p_operation: operation,
    });
    if (error) throw error;
    return data as number;
  },

  // --- Currency Conversion via RPC ---
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    const { data, error } = await supabase.rpc('convert_currency', {
      p_amount: amount,
      p_from_currency: fromCurrency,
      p_to_currency: toCurrency,
    });
    if (error) throw error;
    return data as number;
  },

  // --- Dashboard Stats via RPC ---
  async getDashboardStats() {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) throw error;
    return data;
  },

  // --- Escrow Transactions ---
  getEscrowTransactions: async (userId: string) => {
    const { data } = await supabase.from('escrow_transactions').select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    return data || [];
  },

  createEscrowTransaction: async (escrow: any) => {
    const { data } = await supabase.from('escrow_transactions').insert(escrow).select().single();
    return data;
  },

  updateEscrowStatus: async (id: string, status: string, updates: any = {}) => {
    const { data } = await supabase.from('escrow_transactions').update({ status, ...updates })
      .eq('id', id).select().single();
    return data;
  },

  // --- User Reviews ---
  getUserReviews: async () => {
    const { data } = await supabase.from('user_reviews').select('*, users(name)').order('created_at', { ascending: false });
    return data || [];
  },

  // --- Branches ---
  getBranches: async () => {
    const { data } = await supabase.from('branches').select('*').eq('is_active', true).order('sort_order');
    return data || [];
  },

  // --- Marketing Content ---
  getMarketingContent: async () => {
    const { data } = await supabase.from('marketing_content').select('*').eq('is_active', true);
    return data || [];
  },

  // --- Price Overrides ---
  getPriceOverrides: async () => {
    const { data } = await supabase.from('price_overrides').select('*').eq('is_active', true);
    return data || [];
  },

  calculatePrice: async (basePriceUsd: number, providerId?: string, packageId?: string) => {
    // Check package-level override first, then provider-level, then global
    let markup = 0;
    let markupType = 'percentage';

    if (packageId) {
      const { data: pkgOverride } = await supabase.from('price_overrides')
        .select('*').eq('target_type', 'package').eq('target_id', packageId).eq('is_active', true).single();
      if (pkgOverride) {
        markup = pkgOverride.markup_value;
        markupType = pkgOverride.markup_type;
      }
    }

    if (!markup && providerId) {
      const { data: provOverride } = await supabase.from('price_overrides')
        .select('*').eq('target_type', 'provider').eq('target_id', providerId).eq('is_active', true).single();
      if (provOverride) {
        markup = provOverride.markup_value;
        markupType = provOverride.markup_type;
      }
    }

    if (!markup) {
      const { data: globalOverride } = await supabase.from('price_overrides')
        .select('*').eq('target_type', 'global').eq('is_active', true).limit(1).single();
      if (globalOverride) {
        markup = globalOverride.markup_value;
        markupType = globalOverride.markup_type;
      }
    }

    if (markupType === 'percentage') {
      return basePriceUsd * (1 + markup / 100);
    }
    return basePriceUsd + markup;
  },

  // --- Commission Config ---
  getCommissionConfig: async () => {
    const { data } = await supabase.from('commission_config').select('*').eq('is_active', true);
    return data || [];
  },

  calculateCommission: async (amountUsd: number, providerId?: string, packageId?: string) => {
    let commissionRate = 3; // default 3%
    let commissionType = 'percentage';

    if (packageId) {
      const { data: pkgConfig } = await supabase.from('commission_config')
        .select('*').eq('target_type', 'package').eq('target_id', packageId).eq('is_active', true).single();
      if (pkgConfig) {
        commissionRate = pkgConfig.commission_value;
        commissionType = pkgConfig.commission_type;
      }
    }

    if (commissionRate === 3 && providerId) {
      const { data: provConfig } = await supabase.from('commission_config')
        .select('*').eq('target_type', 'provider').eq('target_id', providerId).eq('is_active', true).single();
      if (provConfig) {
        commissionRate = provConfig.commission_value;
        commissionType = provConfig.commission_type;
      }
    }

    if (commissionType === 'percentage') {
      return amountUsd * (commissionRate / 100);
    }
    return commissionRate;
  },

  // --- Data Exports ---
  createDataExport: async (exportData: any) => {
    const { data } = await supabase.from('data_exports').insert(exportData).select().single();
    return data;
  },

  getDataExports: async () => {
    const { data } = await supabase.from('data_exports').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
  },
};
