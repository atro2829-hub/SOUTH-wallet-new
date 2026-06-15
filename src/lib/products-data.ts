// محفظة الجنوب - South Wallet Products Data
// Comprehensive product catalog for all service providers

export interface ProductItem {
  id: string;
  providerId: string;
  name: string;
  price: number;      // YER price with markup
  priceUSD: number;   // Original USD price
  currency: 'YER';
  executionType: 'manual' | 'auto';
  isActive: boolean;
}

export const EXCHANGE_RATES = {
  USD_TO_YER: 1550,
  SAR_TO_YER: 410,
  YER_TO_USD: 1 / 1550,
  YER_TO_SAR: 1 / 410,
};

export function convertUSDToYER(usd: number): number {
  return Math.round(usd * 1550 * 1.03); // 3% markup
}

export function convertSARToYER(sar: number): number {
  return Math.round(sar * 410 * 1.03);
}

export function getProductsByProvider(providerId: string): ProductItem[] {
  return allProducts.filter(p => p.providerId === providerId);
}

export function getProductsByCategory(
  categoryId: string,
  providers: { id: string; categoryId: string }[]
): ProductItem[] {
  const providerIds = providers.filter(p => p.categoryId === categoryId).map(p => p.id);
  return allProducts.filter(p => providerIds.includes(p.providerId));
}

// Helper to create USD-based products
function usdProduct(
  providerId: string,
  idSuffix: string,
  name: string,
  priceUSD: number,
  executionType: 'manual' | 'auto' = 'auto'
): ProductItem {
  return {
    id: `${providerId}-${idSuffix}`,
    providerId,
    name,
    price: convertUSDToYER(priceUSD),
    priceUSD,
    currency: 'YER',
    executionType,
    isActive: true,
  };
}

// Helper to create YER-based products (telecom, utilities, government)
function yerProduct(
  providerId: string,
  idSuffix: string,
  name: string,
  baseYER: number,
  executionType: 'manual' | 'auto' = 'auto'
): ProductItem {
  return {
    id: `${providerId}-${idSuffix}`,
    providerId,
    name,
    price: Math.round(baseYER * 1.03), // 3% markup
    priceUSD: Math.round((baseYER / 1550) * 100) / 100, // Reverse conversion
    currency: 'YER',
    executionType,
    isActive: true,
  };
}

// ============================================================
// 1. PUBG Mobile (providerId: 'pubg')
// ============================================================
const pubgProducts: ProductItem[] = [
  usdProduct('pubg', 'uc-60', '60 UC', 0.99),
  usdProduct('pubg', 'uc-325', '325 UC', 4.99),
  usdProduct('pubg', 'uc-660', '660 UC', 9.99),
  usdProduct('pubg', 'uc-1800', '1800 UC', 24.99),
  usdProduct('pubg', 'uc-3850', '3850 UC', 49.99),
  usdProduct('pubg', 'uc-8100', '8100 UC', 99.99),
  usdProduct('pubg', 'royal-pass', 'Royal Pass', 11.99),
  usdProduct('pubg', 'royal-pass-elite', 'Royal Pass Elite', 24.99),
  usdProduct('pubg', 'wedding-pack', 'Wedding Pack', 0.99),
  usdProduct('pubg', 'starter-pack', 'Starter Pack', 4.99),
  usdProduct('pubg', 'custom-room-card', 'Custom Room Card', 1.99),
  usdProduct('pubg', 'rename-card', 'Rename Card', 1.99),
  usdProduct('pubg', 'avatar-frame', 'Avatar Frame', 0.99),
  usdProduct('pubg', 'uc-180-bonus', '180 UC Bonus Pack', 3.99),
  usdProduct('pubg', 'uc-400-bonus', '400 UC Bonus Pack', 7.99),
  usdProduct('pubg', 'uc-900-bonus', '900 UC Bonus Pack', 15.99),
  usdProduct('pubg', 'royal-pass-upgrade', 'Royal Pass Upgrade', 11.99),
  usdProduct('pubg', 'skin-crate', 'Skin Crate Coupon', 2.99),
  usdProduct('pubg', 'partner-pack', 'Partner Pack', 9.99),
  usdProduct('pubg', 'anniversary-pack', 'Anniversary Pack', 14.99),
];

// ============================================================
// 2. Free Fire (providerId: 'freefire')
// ============================================================
const freefireProducts: ProductItem[] = [
  usdProduct('freefire', 'diamonds-100', '100 Diamonds', 0.99),
  usdProduct('freefire', 'diamonds-310', '310 Diamonds', 2.99),
  usdProduct('freefire', 'diamonds-520', '520 Diamonds', 4.99),
  usdProduct('freefire', 'diamonds-1060', '1060 Diamonds', 9.99),
  usdProduct('freefire', 'diamonds-2180', '2180 Diamonds', 19.99),
  usdProduct('freefire', 'diamonds-5600', '5600 Diamonds', 49.99),
  usdProduct('freefire', 'membership', 'Membership Monthly', 3.99),
  usdProduct('freefire', 'level-up-pass', 'Level Up Pass', 9.99),
  usdProduct('freefire', 'elite-pass', 'Elite Pass', 9.99),
  usdProduct('freefire', 'elite-bundle', 'Elite Bundle', 19.99),
  usdProduct('freefire', 'incubator-pack', 'Incubator Pack', 4.99),
  usdProduct('freefire', 'weapon-crate', 'Weapon Loot Crate', 1.99),
  usdProduct('freefire', 'diamonds-210-bonus', '210 Diamonds Bonus', 1.99),
  usdProduct('freefire', 'diamonds-1050-bonus', '1050 Diamonds Bonus', 9.99),
  usdProduct('freefire', 'rename-card', 'Rename Card', 1.99),
  usdProduct('freefire', 'resupply-card', 'Resupply Card', 0.99),
  usdProduct('freefire', 'anniversary-pack', 'Anniversary Pack', 14.99),
  usdProduct('freefire', 'summer-pack', 'Summer Pack', 7.99),
  usdProduct('freefire', 'legend-pack', 'Legend Pack', 29.99),
  usdProduct('freefire', 'premium-bundle', 'Premium Bundle', 39.99),
];

// ============================================================
// 3. Call of Duty Mobile (providerId: 'call-of-duty')
// ============================================================
const callOfDutyProducts: ProductItem[] = [
  usdProduct('call-of-duty', 'cp-80', '80 CP', 0.99),
  usdProduct('call-of-duty', 'cp-400', '400 CP', 4.99),
  usdProduct('call-of-duty', 'cp-800', '800 CP', 9.99),
  usdProduct('call-of-duty', 'cp-2000', '2000 CP', 24.99),
  usdProduct('call-of-duty', 'cp-4000', '4000 CP', 49.99),
  usdProduct('call-of-duty', 'cp-8000', '8000 CP', 99.99),
  usdProduct('call-of-duty', 'battle-pass', 'Battle Pass', 9.99),
  usdProduct('call-of-duty', 'battle-pass-bundle', 'Battle Pass Bundle', 24.99),
  usdProduct('call-of-duty', 'starter-pack', 'Starter Pack', 4.99),
  usdProduct('call-of-duty', 'cp-200-bonus', '200 CP Bonus', 2.99),
  usdProduct('call-of-duty', 'cp-1600-bonus', '1600 CP Bonus', 19.99),
  usdProduct('call-of-duty', 'seasonal-pack', 'Seasonal Pack', 14.99),
  usdProduct('call-of-duty', 'weapon-crate', 'Weapon Crate', 1.99),
  usdProduct('call-of-duty', 'legendary-pack', 'Legendary Pack', 29.99),
  usdProduct('call-of-duty', 'rename-token', 'Rename Token', 1.99),
  usdProduct('call-of-duty', 'loadout-slot', 'Extra Loadout Slot', 2.99),
  usdProduct('call-of-duty', 'prime-gaming', 'Prime Gaming Bundle', 9.99),
  usdProduct('call-of-duty', 'zombie-pass', 'Zombie Pass', 9.99),
  usdProduct('call-of-duty', 'elite-pack', 'Elite Pack', 7.99),
  usdProduct('call-of-duty', 'pro-pack', 'Pro Pack', 19.99),
];

// ============================================================
// 4. Clash Royale (providerId: 'clash-royale')
// ============================================================
const clashRoyaleProducts: ProductItem[] = [
  usdProduct('clash-royale', 'gems-80', '80 Gems', 0.99),
  usdProduct('clash-royale', 'gems-500', '500 Gems', 4.99),
  usdProduct('clash-royale', 'gems-1200', '1200 Gems', 9.99),
  usdProduct('clash-royale', 'gems-2500', '2500 Gems', 19.99),
  usdProduct('clash-royale', 'gems-6500', '6500 Gems', 49.99),
  usdProduct('clash-royale', 'gems-14000', '14000 Gems', 99.99),
  usdProduct('clash-royale', 'pass-royale', 'Pass Royale', 4.99),
  usdProduct('clash-royale', 'gold-100k', '100,000 Gold', 0.99),
  usdProduct('clash-royale', 'gold-500k', '500,000 Gold', 4.99),
  usdProduct('clash-royale', 'gold-1m', '1,000,000 Gold', 9.99),
  usdProduct('clash-royale', 'magic-item-1', 'Wild Card Common', 0.99),
  usdProduct('clash-royale', 'magic-item-2', 'Wild Card Rare', 1.99),
  usdProduct('clash-royale', 'magic-item-3', 'Wild Card Epic', 4.99),
  usdProduct('clash-royale', 'magic-item-4', 'Wild Card Legendary', 19.99),
  usdProduct('clash-royale', 'emote-pack', 'Emote Pack', 2.99),
  usdProduct('clash-royale', 'tower-skin', 'Tower Skin', 4.99),
  usdProduct('clash-royale', 'arena-pack', 'Arena Pack', 9.99),
  usdProduct('clash-royale', 'diamond-pass', 'Diamond Pass Royale', 14.99),
  usdProduct('clash-royale', 'mega-chest', 'Mega Lightning Chest', 4.99),
  usdProduct('clash-royale', 'legendary-chest', 'Legendary Chest', 9.99),
];

// ============================================================
// 5. Clash of Clans (providerId: 'clash-of-clans')
// ============================================================
const clashOfClansProducts: ProductItem[] = [
  usdProduct('clash-of-clans', 'gems-80', '80 Gems', 0.99),
  usdProduct('clash-of-clans', 'gems-500', '500 Gems', 4.99),
  usdProduct('clash-of-clans', 'gems-1200', '1200 Gems', 9.99),
  usdProduct('clash-of-clans', 'gems-2500', '2500 Gems', 19.99),
  usdProduct('clash-of-clans', 'gems-6500', '6500 Gems', 49.99),
  usdProduct('clash-of-clans', 'gems-14000', '14000 Gems', 99.99),
  usdProduct('clash-of-clans', 'gold-pass', 'Gold Pass', 4.99),
  usdProduct('clash-of-clans', 'gold-1m', '1,000,000 Gold', 0.99),
  usdProduct('clash-of-clans', 'gold-5m', '5,000,000 Gold', 4.99),
  usdProduct('clash-of-clans', 'elixir-1m', '1,000,000 Elixir', 0.99),
  usdProduct('clash-of-clans', 'elixir-5m', '5,000,000 Elixir', 4.99),
  usdProduct('clash-of-clans', 'dark-elixir-10k', '10,000 Dark Elixir', 4.99),
  usdProduct('clash-of-clans', 'dark-elixir-50k', '50,000 Dark Elixir', 19.99),
  usdProduct('clash-of-clans', 'builder-potion', 'Builder Potion', 0.99),
  usdProduct('clash-of-clans', 'research-potion', 'Research Potion', 0.99),
  usdProduct('clash-of-clans', 'resource-potion', 'Resource Potion', 1.99),
  usdProduct('clash-of-clans', 'hero-potion', 'Hero Potion', 4.99),
  usdProduct('clash-of-clans', 'power-potion', 'Power Potion', 4.99),
  usdProduct('clash-of-clans', 'wall-ring-5', '5 Wall Rings', 0.99),
  usdProduct('clash-of-clans', 'wall-ring-25', '25 Wall Rings', 4.99),
];

// ============================================================
// 6. Roblox (providerId: 'roblox')
// ============================================================
const robloxProducts: ProductItem[] = [
  usdProduct('roblox', 'robux-80', '80 Robux', 0.99),
  usdProduct('roblox', 'robux-200', '200 Robux', 2.99),
  usdProduct('roblox', 'robux-400', '400 Robux', 4.99),
  usdProduct('roblox', 'robux-800', '800 Robux', 9.99),
  usdProduct('roblox', 'robux-1700', '1700 Robux', 19.99),
  usdProduct('roblox', 'robux-4500', '4500 Robux', 49.99),
  usdProduct('roblox', 'robux-10000', '10000 Robux', 99.99),
  usdProduct('roblox', 'premium-450', 'Premium 450', 4.99),
  usdProduct('roblox', 'premium-1000', 'Premium 1000', 9.99),
  usdProduct('roblox', 'premium-2200', 'Premium 2200', 19.99),
  usdProduct('roblox', 'robux-1600-bonus', '1600 Robux Bonus', 19.99),
  usdProduct('roblox', 'robux-400-bonus', '400 Robux Bonus', 4.99),
  usdProduct('roblox', 'game-pass-1', 'Game Pass - Basic', 0.99),
  usdProduct('roblox', 'game-pass-2', 'Game Pass - Standard', 4.99),
  usdProduct('roblox', 'game-pass-3', 'Game Pass - Premium', 9.99),
  usdProduct('roblox', 'classic-clothing', 'Classic Clothing Bundle', 2.99),
  usdProduct('roblox', 'avatar-upgrade', 'Avatar Upgrade Pack', 4.99),
  usdProduct('roblox', 'limited-item', 'Limited Item Access', 14.99),
  usdProduct('roblox', 'robux-4000', '4000 Robux', 44.99),
  usdProduct('roblox', 'robux-750-bonus', '750 Robux Bonus', 9.99),
];

// ============================================================
// 7. Fortnite (providerId: 'fortnite')
// ============================================================
const fortniteProducts: ProductItem[] = [
  usdProduct('fortnite', 'vbucks-1000', '1000 V-Bucks', 9.99),
  usdProduct('fortnite', 'vbucks-2800', '2800 V-Bucks', 24.99),
  usdProduct('fortnite', 'vbucks-5000', '5000 V-Bucks', 39.99),
  usdProduct('fortnite', 'vbucks-13500', '13500 V-Bucks', 79.99),
  usdProduct('fortnite', 'battle-pass', 'Battle Pass', 9.99),
  usdProduct('fortnite', 'battle-bundle', 'Battle Bundle', 24.99),
  usdProduct('fortnite', 'vbucks-500', '500 V-Bucks', 4.99),
  usdProduct('fortnite', 'starter-pack', 'Starter Pack', 3.99),
  usdProduct('fortnite', 'legends-pack', 'Legends Pack', 19.99),
  usdProduct('fortnite', 'manga-pack', 'Manga Series Pack', 14.99),
  usdProduct('fortnite', 'icon-pack', 'Icon Series Pack', 9.99),
  usdProduct('fortnite', 'glider-pack', 'Glider Bundle', 4.99),
  usdProduct('fortnite', 'emote-pack', 'Emote Bundle', 2.99),
  usdProduct('fortnite', 'skin-bundle', 'Skin Bundle', 14.99),
  usdProduct('fortnite', 'wrap-pack', 'Wrap Bundle', 1.99),
  usdProduct('fortnite', 'crew-pack', 'Crew Pack Monthly', 11.99),
  usdProduct('fortnite', 'vbucks-2500', '2500 V-Bucks', 19.99),
  usdProduct('fortnite', 'save-world', 'Save the World', 14.99),
  usdProduct('fortnite', 'neon-pack', 'Neon Pack', 7.99),
  usdProduct('fortnite', 'summer-pack', 'Summer Pack', 12.99),
];

// ============================================================
// 8. Minecraft (providerId: 'minecraft')
// ============================================================
const minecraftProducts: ProductItem[] = [
  usdProduct('minecraft', 'minecoins-320', '320 Minecoins', 1.99),
  usdProduct('minecraft', 'minecoins-1020', '1020 Minecoins', 5.99),
  usdProduct('minecraft', 'minecoins-1720', '1720 Minecoins', 9.99),
  usdProduct('minecraft', 'minecoins-3220', '3220 Minecoins', 18.99),
  usdProduct('minecraft', 'realm-plus-monthly', 'Realm Plus Monthly', 7.99),
  usdProduct('minecraft', 'realm-plus-3m', 'Realm Plus 3 Months', 21.99),
  usdProduct('minecraft', 'realm-plus-6m', 'Realm Plus 6 Months', 39.99),
  usdProduct('minecraft', 'minecoins-5500', '5500 Minecoins', 29.99),
  usdProduct('minecraft', 'minecoins-11000', '11000 Minecoins', 59.99),
  usdProduct('minecraft', 'skin-pack-1', 'Adventure Skin Pack', 2.99),
  usdProduct('minecraft', 'skin-pack-2', 'Fantasy Skin Pack', 3.99),
  usdProduct('minecraft', 'texture-pack-1', 'Natural Texture Pack', 2.99),
  usdProduct('minecraft', 'texture-pack-2', 'City Texture Pack', 2.99),
  usdProduct('minecraft', 'mashup-1', 'Greek Mythology Mashup', 5.99),
  usdProduct('minecraft', 'mashup-2', 'Medieval Mashup', 5.99),
  usdProduct('minecraft', 'world-1', 'Adventure World', 4.99),
  usdProduct('minecraft', 'world-2', 'Survival Island World', 3.99),
  usdProduct('minecraft', 'realm-monthly', 'Realm Monthly (2 Players)', 3.99),
  usdProduct('minecraft', 'marketplace-pass', 'Marketplace Pass', 3.99),
  usdProduct('minecraft', 'minecoins-880', '880 Minecoins', 4.99),
];

// ============================================================
// 9. Valorant (providerId: 'valorant')
// ============================================================
const valorantProducts: ProductItem[] = [
  usdProduct('valorant', 'vp-125', '125 VP', 1.49),
  usdProduct('valorant', 'vp-420', '420 VP', 4.99),
  usdProduct('valorant', 'vp-700', '700 VP', 9.99),
  usdProduct('valorant', 'vp-1375', '1375 VP', 19.99),
  usdProduct('valorant', 'vp-2400', '2400 VP', 34.99),
  usdProduct('valorant', 'vp-4000', '4000 VP', 49.99),
  usdProduct('valorant', 'vp-8150', '8150 VP', 99.99),
  usdProduct('valorant', 'battlepass', 'Battlepass', 9.99),
  usdProduct('valorant', 'battlepass-bundle', 'Battlepass Bundle (20 Levels)', 24.99),
  usdProduct('valorant', 'vp-200-bonus', '200 VP Bonus', 2.99),
  usdProduct('valorant', 'skin-pack-1', 'Deluxe Skin Pack', 14.99),
  usdProduct('valorant', 'skin-pack-2', 'Premium Skin Pack', 29.99),
  usdProduct('valorant', 'player-card', 'Player Card Pack', 2.99),
  usdProduct('valorant', 'buddy-pack', 'Gun Buddy Pack', 4.99),
  usdProduct('valorant', 'spray-pack', 'Spray Pack', 1.99),
  usdProduct('valorant', 'vp-1050-bonus', '1050 VP Bonus', 14.99),
  usdProduct('valorant', 'starter-pack', 'Starter Pack', 4.99),
  usdProduct('valorant', 'night-market', 'Night Market Token', 9.99),
  usdProduct('valorant', 'rgx-pack', 'RGX 11z Pro Pack', 39.99),
  usdProduct('valorant', 'elderflame', 'Elderflame Pack', 49.99),
];

// ============================================================
// 10. League of Legends (providerId: 'league-legends')
// ============================================================
const leagueLegendsProducts: ProductItem[] = [
  usdProduct('league-legends', 'rp-250', '250 RP', 2),
  usdProduct('league-legends', 'rp-500', '500 RP', 5),
  usdProduct('league-legends', 'rp-750', '750 RP', 7.5),
  usdProduct('league-legends', 'rp-1000', '1000 RP', 10),
  usdProduct('league-legends', 'rp-1500', '1500 RP', 15),
  usdProduct('league-legends', 'rp-3000', '3000 RP', 30),
  usdProduct('league-legends', 'rp-5000', '5000 RP', 50),
  usdProduct('league-legends', 'rp-7200', '7200 RP', 72),
  usdProduct('league-legends', 'rp-15000', '15000 RP', 150),
  usdProduct('league-legends', 'skin-1', 'Champion Skin - Basic', 3.9),
  usdProduct('league-legends', 'skin-2', 'Champion Skin - Epic', 7.5),
  usdProduct('league-legends', 'skin-3', 'Champion Skin - Legendary', 13.5),
  usdProduct('league-legends', 'skin-4', 'Champion Skin - Ultimate', 22),
  usdProduct('league-legends', 'champion-1', 'Champion Unlock', 4.9),
  usdProduct('league-legends', 'champion-bundle', 'Champion Bundle (3)', 11.99),
  usdProduct('league-legends', 'emote-pack', 'Emote Pack', 2.5),
  usdProduct('league-legends', 'ward-skin', 'Ward Skin', 2.5),
  usdProduct('league-legends', 'icon-pack', 'Icon Pack', 1.5),
  usdProduct('league-legends', 'pass', 'Event Pass', 13),
  usdProduct('league-legends', 'pass-bundle', 'Event Pass Bundle', 26),
];

// ============================================================
// 11. Genshin Impact (providerId: 'genshin-impact')
// ============================================================
const genshinImpactProducts: ProductItem[] = [
  usdProduct('genshin-impact', 'crystal-60', '60 Genesis Crystals', 0.99),
  usdProduct('genshin-impact', 'crystal-330', '300+30 Genesis Crystals', 4.99),
  usdProduct('genshin-impact', 'crystal-1090', '980+110 Genesis Crystals', 14.99),
  usdProduct('genshin-impact', 'crystal-2240', '1980+260 Genesis Crystals', 29.99),
  usdProduct('genshin-impact', 'crystal-3880', '3280+600 Genesis Crystals', 49.99),
  usdProduct('genshin-impact', 'crystal-8080', '6480+1600 Genesis Crystals', 99.99),
  usdProduct('genshin-impact', 'welkin', 'Blessing of the Welkin Moon', 4.99),
  usdProduct('genshin-impact', 'gnostic-chorus', 'Gnostic Chorus', 9.99),
  usdProduct('genshin-impact', 'gnostic-hymn', 'Gnostic Hymn', 9.99),
  usdProduct('genshin-impact', 'starter-pack', 'Beginner Pack', 0.99),
  usdProduct('genshin-impact', 'adventure-pack', 'Adventure Pack', 4.99),
  usdProduct('genshin-impact', 'vision-pack', 'Vision Pack', 19.99),
  usdProduct('genshin-impact', 'crystal-660', '660 Genesis Crystals', 9.99),
  usdProduct('genshin-impact', 'crystal-2000', '2000 Genesis Crystals', 29.99),
  usdProduct('genshin-impact', 'crystal-4000', '4000 Genesis Crystals', 49.99),
  usdProduct('genshin-impact', 'top-up-1', 'First Top-Up Bonus', 4.99),
  usdProduct('genshin-impact', 'top-up-2', 'Double Crystal Bonus', 9.99),
  usdProduct('genshin-impact', 'namecard', 'Namecard Set', 1.99),
  usdProduct('genshin-impact', 'glider-skin', 'Wind Glider Skin', 14.99),
  usdProduct('genshin-impact', 'anniversary-pack', 'Anniversary Pack', 24.99),
];

// ============================================================
// 12. Honkai Star Rail (providerId: 'honkai-star')
// ============================================================
const honkaiStarProducts: ProductItem[] = [
  usdProduct('honkai-star', 'shard-60', '60 Oneiric Shards', 0.99),
  usdProduct('honkai-star', 'shard-330', '300+30 Oneiric Shards', 4.99),
  usdProduct('honkai-star', 'shard-1090', '980+110 Oneiric Shards', 14.99),
  usdProduct('honkai-star', 'shard-2240', '1980+260 Oneiric Shards', 29.99),
  usdProduct('honkai-star', 'shard-3880', '3280+600 Oneiric Shards', 49.99),
  usdProduct('honkai-star', 'shard-8080', '6480+1600 Oneiric Shards', 99.99),
  usdProduct('honkai-star', 'express-pass', 'Express Supply Pass', 4.99),
  usdProduct('honkai-star', 'nameless-honor', 'Nameless Honor', 9.99),
  usdProduct('honkai-star', 'nameless-medal', 'Nameless Medal', 19.99),
  usdProduct('honkai-star', 'starter-pack', 'Trailblaze Starter Pack', 0.99),
  usdProduct('honkai-star', 'adventure-pack', 'Adventure Pack', 4.99),
  usdProduct('honkai-star', 'shard-660', '660 Oneiric Shards', 9.99),
  usdProduct('honkai-star', 'shard-2000', '2000 Oneiric Shards', 29.99),
  usdProduct('honkai-star', 'shard-4000', '4000 Oneiric Shards', 49.99),
  usdProduct('honkai-star', 'double-bonus', 'First Top-Up Double', 4.99),
  usdProduct('honkai-star', 'phone-wallpaper', 'Phone Wallpaper Pack', 1.99),
  usdProduct('honkai-star', 'anniversary-pack', 'Anniversary Pack', 24.99),
  usdProduct('honkai-star', 'cosmetic-pack', 'Cosmetic Pack', 7.99),
  usdProduct('honkai-star', 'express-bundle', 'Express Bundle', 14.99),
  usdProduct('honkai-star', 'starlight-pack', 'Starlight Pack', 39.99),
];

// ============================================================
// 13. Steam (providerId: 'steam')
// ============================================================
const steamProducts: ProductItem[] = [
  usdProduct('steam', 'wallet-5', 'Steam Wallet $5', 5),
  usdProduct('steam', 'wallet-10', 'Steam Wallet $10', 10),
  usdProduct('steam', 'wallet-20', 'Steam Wallet $20', 20),
  usdProduct('steam', 'wallet-25', 'Steam Wallet $25', 25),
  usdProduct('steam', 'wallet-50', 'Steam Wallet $50', 50),
  usdProduct('steam', 'wallet-100', 'Steam Wallet $100', 100),
  usdProduct('steam', 'wallet-3', 'Steam Wallet $3', 3, 'manual'),
  usdProduct('steam', 'wallet-15', 'Steam Wallet $15', 15, 'manual'),
  usdProduct('steam', 'wallet-30', 'Steam Wallet $30', 30, 'manual'),
  usdProduct('steam', 'game-valve', 'Valve Complete Pack', 39.99, 'manual'),
  usdProduct('steam', 'game-indie-1', 'Indie Game Bundle', 9.99, 'manual'),
  usdProduct('steam', 'game-indie-2', 'Indie Mega Bundle', 19.99, 'manual'),
  usdProduct('steam', 'game-aaa-1', 'AAA Title $29.99', 29.99, 'manual'),
  usdProduct('steam', 'game-aaa-2', 'AAA Title $49.99', 49.99, 'manual'),
  usdProduct('steam', 'game-aaa-3', 'AAA Title $59.99', 59.99, 'manual'),
  usdProduct('steam', 'dlc-basic', 'DLC - Basic', 4.99, 'manual'),
  usdProduct('steam', 'dlc-expansion', 'DLC - Expansion', 14.99, 'manual'),
  usdProduct('steam', 'season-pass', 'Season Pass', 24.99, 'manual'),
  usdProduct('steam', 'gift-card-200', 'Gift Card $200', 200, 'manual'),
  usdProduct('steam', 'wallet-75', 'Steam Wallet $75', 75, 'manual'),
];

// ============================================================
// 14. Netflix (providerId: 'netflix')
// ============================================================
const netflixProducts: ProductItem[] = [
  usdProduct('netflix', 'basic-1m', 'Basic Monthly', 6.99),
  usdProduct('netflix', 'standard-1m', 'Standard Monthly', 15.49),
  usdProduct('netflix', 'premium-1m', 'Premium Monthly', 22.99),
  usdProduct('netflix', 'basic-3m', 'Basic 3 Months', 20.97),
  usdProduct('netflix', 'standard-3m', 'Standard 3 Months', 46.47),
  usdProduct('netflix', 'premium-3m', 'Premium 3 Months', 68.97),
  usdProduct('netflix', 'basic-6m', 'Basic 6 Months', 41.94),
  usdProduct('netflix', 'standard-6m', 'Standard 6 Months', 92.94),
  usdProduct('netflix', 'premium-6m', 'Premium 6 Months', 137.94),
  usdProduct('netflix', 'basic-1y', 'Basic 1 Year', 83.88),
  usdProduct('netflix', 'standard-1y', 'Standard 1 Year', 185.88),
  usdProduct('netflix', 'premium-1y', 'Premium 1 Year', 275.88),
  usdProduct('netflix', 'mobile-1m', 'Mobile Plan Monthly', 4.99),
  usdProduct('netflix', 'mobile-3m', 'Mobile Plan 3 Months', 14.97),
  usdProduct('netflix', 'mobile-6m', 'Mobile Plan 6 Months', 29.94),
  usdProduct('netflix', 'mobile-1y', 'Mobile Plan 1 Year', 59.88),
  usdProduct('netflix', 'standard-ads-1m', 'Standard with Ads Monthly', 6.99),
  usdProduct('netflix', 'standard-ads-3m', 'Standard with Ads 3 Months', 20.97),
  usdProduct('netflix', 'standard-ads-6m', 'Standard with Ads 6 Months', 41.94),
  usdProduct('netflix', 'standard-ads-1y', 'Standard with Ads 1 Year', 83.88),
];

// ============================================================
// 15. Spotify (providerId: 'spotify')
// ============================================================
const spotifyProducts: ProductItem[] = [
  usdProduct('spotify', 'individual-1m', 'Individual Monthly', 9.99),
  usdProduct('spotify', 'duo-1m', 'Duo Monthly', 12.99),
  usdProduct('spotify', 'family-1m', 'Family Monthly', 15.99),
  usdProduct('spotify', 'student-1m', 'Student Monthly', 4.99),
  usdProduct('spotify', 'individual-3m', 'Individual 3 Months', 29.97),
  usdProduct('spotify', 'individual-6m', 'Individual 6 Months', 59.94),
  usdProduct('spotify', 'individual-1y', 'Individual 1 Year', 119.88),
  usdProduct('spotify', 'duo-3m', 'Duo 3 Months', 38.97),
  usdProduct('spotify', 'duo-6m', 'Duo 6 Months', 77.94),
  usdProduct('spotify', 'duo-1y', 'Duo 1 Year', 155.88),
  usdProduct('spotify', 'family-3m', 'Family 3 Months', 47.97),
  usdProduct('spotify', 'family-6m', 'Family 6 Months', 95.94),
  usdProduct('spotify', 'family-1y', 'Family 1 Year', 191.88),
  usdProduct('spotify', 'student-3m', 'Student 3 Months', 14.97),
  usdProduct('spotify', 'student-6m', 'Student 6 Months', 29.94),
  usdProduct('spotify', 'student-1y', 'Student 1 Year', 59.88),
  usdProduct('spotify', 'gift-1m', 'Gift Card 1 Month', 9.99),
  usdProduct('spotify', 'gift-3m', 'Gift Card 3 Months', 29.97),
  usdProduct('spotify', 'gift-6m', 'Gift Card 6 Months', 59.94),
  usdProduct('spotify', 'gift-1y', 'Gift Card 1 Year', 119.88),
];

// ============================================================
// 16. YouTube Premium (providerId: 'youtube-premium')
// ============================================================
const youtubePremiumProducts: ProductItem[] = [
  usdProduct('youtube-premium', 'individual-1m', 'Individual Monthly', 13.99),
  usdProduct('youtube-premium', 'family-1m', 'Family Monthly', 22.99),
  usdProduct('youtube-premium', 'student-1m', 'Student Monthly', 7.99),
  usdProduct('youtube-premium', 'individual-3m', 'Individual 3 Months', 41.97),
  usdProduct('youtube-premium', 'individual-6m', 'Individual 6 Months', 83.94),
  usdProduct('youtube-premium', 'individual-1y', 'Individual 1 Year', 167.88),
  usdProduct('youtube-premium', 'family-3m', 'Family 3 Months', 68.97),
  usdProduct('youtube-premium', 'family-6m', 'Family 6 Months', 137.94),
  usdProduct('youtube-premium', 'family-1y', 'Family 1 Year', 275.88),
  usdProduct('youtube-premium', 'student-3m', 'Student 3 Months', 23.97),
  usdProduct('youtube-premium', 'student-6m', 'Student 6 Months', 47.94),
  usdProduct('youtube-premium', 'student-1y', 'Student 1 Year', 95.88),
  usdProduct('youtube-premium', 'music-1m', 'YouTube Music Monthly', 9.99),
  usdProduct('youtube-premium', 'music-3m', 'YouTube Music 3 Months', 29.97),
  usdProduct('youtube-premium', 'music-6m', 'YouTube Music 6 Months', 59.94),
  usdProduct('youtube-premium', 'music-1y', 'YouTube Music 1 Year', 119.88),
  usdProduct('youtube-premium', 'trial-1m', '1 Month Free Trial', 0.99),
  usdProduct('youtube-premium', 'gift-3m', 'Gift Card 3 Months', 41.97),
  usdProduct('youtube-premium', 'gift-6m', 'Gift Card 6 Months', 83.94),
  usdProduct('youtube-premium', 'gift-1y', 'Gift Card 1 Year', 167.88),
];

// ============================================================
// 17. Google Play (providerId: 'google-play')
// ============================================================
const googlePlayProducts: ProductItem[] = [
  usdProduct('google-play', 'card-5', 'Google Play $5', 5),
  usdProduct('google-play', 'card-10', 'Google Play $10', 10),
  usdProduct('google-play', 'card-15', 'Google Play $15', 15),
  usdProduct('google-play', 'card-25', 'Google Play $25', 25),
  usdProduct('google-play', 'card-50', 'Google Play $50', 50),
  usdProduct('google-play', 'card-100', 'Google Play $100', 100),
  usdProduct('google-play', 'card-200', 'Google Play $200', 200),
  usdProduct('google-play', 'card-300', 'Google Play $300', 300),
  usdProduct('google-play', 'card-500', 'Google Play $500', 500),
  usdProduct('google-play', 'promo-5', 'Promo Code $5', 5),
  usdProduct('google-play', 'promo-10', 'Promo Code $10', 10),
  usdProduct('google-play', 'promo-25', 'Promo Code $25', 25),
  usdProduct('google-play', 'promo-50', 'Promo Code $50', 50),
  usdProduct('google-play', 'gift-5', 'Gift Card $5', 5),
  usdProduct('google-play', 'gift-10', 'Gift Card $10', 10),
  usdProduct('google-play', 'gift-25', 'Gift Card $25', 25),
  usdProduct('google-play', 'gift-50', 'Gift Card $50', 50),
  usdProduct('google-play', 'gift-100', 'Gift Card $100', 100),
  usdProduct('google-play', 'bundle-30', 'Bundle $30', 30),
  usdProduct('google-play', 'bundle-75', 'Bundle $75', 75),
];

// ============================================================
// 18. iTunes (providerId: 'apple-itunes')
// ============================================================
const itunesProducts: ProductItem[] = [
  usdProduct('apple-itunes', 'card-5', 'iTunes $5', 5),
  usdProduct('apple-itunes', 'card-10', 'iTunes $10', 10),
  usdProduct('apple-itunes', 'card-15', 'iTunes $15', 15),
  usdProduct('apple-itunes', 'card-25', 'iTunes $25', 25),
  usdProduct('apple-itunes', 'card-50', 'iTunes $50', 50),
  usdProduct('apple-itunes', 'card-100', 'iTunes $100', 100),
  usdProduct('apple-itunes', 'card-200', 'iTunes $200', 200),
  usdProduct('apple-itunes', 'card-300', 'iTunes $300', 300),
  usdProduct('apple-itunes', 'card-500', 'iTunes $500', 500),
  usdProduct('apple-itunes', 'app-store-5', 'App Store $5', 5),
  usdProduct('apple-itunes', 'app-store-10', 'App Store $10', 10),
  usdProduct('apple-itunes', 'app-store-25', 'App Store $25', 25),
  usdProduct('apple-itunes', 'app-store-50', 'App Store $50', 50),
  usdProduct('apple-itunes', 'app-store-100', 'App Store $100', 100),
  usdProduct('apple-itunes', 'gift-5', 'Gift Card $5', 5),
  usdProduct('apple-itunes', 'gift-10', 'Gift Card $10', 10),
  usdProduct('apple-itunes', 'gift-25', 'Gift Card $25', 25),
  usdProduct('apple-itunes', 'gift-50', 'Gift Card $50', 50),
  usdProduct('apple-itunes', 'bundle-30', 'Bundle $30', 30),
  usdProduct('apple-itunes', 'bundle-75', 'Bundle $75', 75),
];

// ============================================================
// 19. Amazon (providerId: 'amazon-gift')
// ============================================================
const amazonProducts: ProductItem[] = [
  usdProduct('amazon-gift', 'card-5', 'Amazon Gift Card $5', 5),
  usdProduct('amazon-gift', 'card-10', 'Amazon Gift Card $10', 10),
  usdProduct('amazon-gift', 'card-15', 'Amazon Gift Card $15', 15),
  usdProduct('amazon-gift', 'card-25', 'Amazon Gift Card $25', 25),
  usdProduct('amazon-gift', 'card-50', 'Amazon Gift Card $50', 50),
  usdProduct('amazon-gift', 'card-100', 'Amazon Gift Card $100', 100),
  usdProduct('amazon-gift', 'card-200', 'Amazon Gift Card $200', 200),
  usdProduct('amazon-gift', 'card-300', 'Amazon Gift Card $300', 300),
  usdProduct('amazon-gift', 'card-500', 'Amazon Gift Card $500', 500),
  usdProduct('amazon-gift', 'prime-1m', 'Amazon Prime Monthly', 14.99),
  usdProduct('amazon-gift', 'prime-1y', 'Amazon Prime 1 Year', 139),
  usdProduct('amazon-gift', 'prime-student', 'Prime Student Monthly', 7.49),
  usdProduct('amazon-gift', 'music-1m', 'Amazon Music Monthly', 9.99),
  usdProduct('amazon-gift', 'kindle-unlimited', 'Kindle Unlimited Monthly', 11.99),
  usdProduct('amazon-gift', 'audible-1m', 'Audible Monthly', 14.95),
  usdProduct('amazon-gift', 'card-25-gift', 'Gift Box $25', 25),
  usdProduct('amazon-gift', 'card-50-gift', 'Gift Box $50', 50),
  usdProduct('amazon-gift', 'card-75', 'Gift Card $75', 75),
  usdProduct('amazon-gift', 'card-150', 'Gift Card $150', 150),
  usdProduct('amazon-gift', 'card-250', 'Gift Card $250', 250),
];

// ============================================================
// 20. PlayStation Network (providerId: 'psn-card')
// ============================================================
const psnProducts: ProductItem[] = [
  usdProduct('psn-card', 'card-5', 'PSN Card $5', 5),
  usdProduct('psn-card', 'card-10', 'PSN Card $10', 10),
  usdProduct('psn-card', 'card-15', 'PSN Card $15', 15),
  usdProduct('psn-card', 'card-25', 'PSN Card $25', 25),
  usdProduct('psn-card', 'card-50', 'PSN Card $50', 50),
  usdProduct('psn-card', 'card-100', 'PSN Card $100', 100),
  usdProduct('psn-card', 'plus-1m', 'PS Plus Essential Monthly', 9.99),
  usdProduct('psn-card', 'plus-3m', 'PS Plus Essential 3 Months', 24.99),
  usdProduct('psn-card', 'plus-1y', 'PS Plus Essential 1 Year', 59.99),
  usdProduct('psn-card', 'plus-extra-1y', 'PS Plus Extra 1 Year', 99.99),
  usdProduct('psn-card', 'plus-premium-1y', 'PS Plus Premium 1 Year', 159.99),
  usdProduct('psn-card', 'now-1m', 'PS Now Monthly', 9.99),
  usdProduct('psn-card', 'card-200', 'PSN Card $200', 200),
  usdProduct('psn-card', 'card-300', 'PSN Card $300', 300),
  usdProduct('psn-card', 'card-500', 'PSN Card $500', 500),
  usdProduct('psn-card', 'game-29', 'Game Download $29.99', 29.99, 'manual'),
  usdProduct('psn-card', 'game-49', 'Game Download $49.99', 49.99, 'manual'),
  usdProduct('psn-card', 'game-69', 'Game Download $69.99', 69.99, 'manual'),
  usdProduct('psn-card', 'add-on-10', 'Add-On $9.99', 9.99, 'manual'),
  usdProduct('psn-card', 'add-on-25', 'Add-On $24.99', 24.99, 'manual'),
];

// ============================================================
// 21. Xbox (providerId: 'xbox-card')
// ============================================================
const xboxProducts: ProductItem[] = [
  usdProduct('xbox-card', 'card-5', 'Xbox Gift Card $5', 5),
  usdProduct('xbox-card', 'card-10', 'Xbox Gift Card $10', 10),
  usdProduct('xbox-card', 'card-15', 'Xbox Gift Card $15', 15),
  usdProduct('xbox-card', 'card-25', 'Xbox Gift Card $25', 25),
  usdProduct('xbox-card', 'card-50', 'Xbox Gift Card $50', 50),
  usdProduct('xbox-card', 'card-100', 'Xbox Gift Card $100', 100),
  usdProduct('xbox-card', 'game-pass-1m', 'Game Pass Core Monthly', 9.99),
  usdProduct('xbox-card', 'game-pass-3m', 'Game Pass Core 3 Months', 24.99),
  usdProduct('xbox-card', 'game-pass-1y', 'Game Pass Core 1 Year', 59.99),
  usdProduct('xbox-card', 'game-pass-ultimate-1m', 'Game Pass Ultimate Monthly', 16.99),
  usdProduct('xbox-card', 'game-pass-ultimate-3m', 'Game Pass Ultimate 3 Months', 49.99),
  usdProduct('xbox-card', 'live-1m', 'Xbox Live Gold Monthly', 9.99),
  usdProduct('xbox-card', 'live-3m', 'Xbox Live Gold 3 Months', 24.99),
  usdProduct('xbox-card', 'live-1y', 'Xbox Live Gold 1 Year', 59.99),
  usdProduct('xbox-card', 'card-200', 'Xbox Gift Card $200', 200),
  usdProduct('xbox-card', 'card-300', 'Xbox Gift Card $300', 300),
  usdProduct('xbox-card', 'card-500', 'Xbox Gift Card $500', 500),
  usdProduct('xbox-card', 'game-29', 'Game Download $29.99', 29.99, 'manual'),
  usdProduct('xbox-card', 'game-49', 'Game Download $49.99', 49.99, 'manual'),
  usdProduct('xbox-card', 'game-69', 'Game Download $69.99', 69.99, 'manual'),
];

// ============================================================
// 22. Nintendo (providerId: 'nintendo-card')
// ============================================================
const nintendoProducts: ProductItem[] = [
  usdProduct('nintendo-card', 'card-5', 'Nintendo eShop $5', 5),
  usdProduct('nintendo-card', 'card-10', 'Nintendo eShop $10', 10),
  usdProduct('nintendo-card', 'card-15', 'Nintendo eShop $15', 15),
  usdProduct('nintendo-card', 'card-25', 'Nintendo eShop $25', 25),
  usdProduct('nintendo-card', 'card-50', 'Nintendo eShop $50', 50),
  usdProduct('nintendo-card', 'card-100', 'Nintendo eShop $100', 100),
  usdProduct('nintendo-card', 'online-1m', 'Nintendo Switch Online Monthly', 3.99),
  usdProduct('nintendo-card', 'online-3m', 'Nintendo Switch Online 3 Months', 7.99),
  usdProduct('nintendo-card', 'online-1y', 'Nintendo Switch Online 1 Year', 19.99),
  usdProduct('nintendo-card', 'online-family-1y', 'NSO Family 1 Year', 34.99),
  usdProduct('nintendo-card', 'online-expansion-1y', 'NSO + Expansion Pack 1 Year', 49.99),
  usdProduct('nintendo-card', 'online-expansion-family', 'NSO + Expansion Family', 79.99),
  usdProduct('nintendo-card', 'card-200', 'Nintendo eShop $200', 200),
  usdProduct('nintendo-card', 'card-300', 'Nintendo eShop $300', 300),
  usdProduct('nintendo-card', 'card-500', 'Nintendo eShop $500', 500),
  usdProduct('nintendo-card', 'game-29', 'Game Download $29.99', 29.99, 'manual'),
  usdProduct('nintendo-card', 'game-49', 'Game Download $49.99', 49.99, 'manual'),
  usdProduct('nintendo-card', 'game-59', 'Game Download $59.99', 59.99, 'manual'),
  usdProduct('nintendo-card', 'dlc-10', 'DLC $9.99', 9.99, 'manual'),
  usdProduct('nintendo-card', 'dlc-25', 'DLC $24.99', 24.99, 'manual'),
];

// ============================================================
// 23. Visa Virtual (providerId: 'visa-virtual')
// ============================================================
const visaVirtualProducts: ProductItem[] = [
  usdProduct('visa-virtual', 'card-5', 'Visa Virtual $5', 5),
  usdProduct('visa-virtual', 'card-10', 'Visa Virtual $10', 10),
  usdProduct('visa-virtual', 'card-15', 'Visa Virtual $15', 15),
  usdProduct('visa-virtual', 'card-25', 'Visa Virtual $25', 25),
  usdProduct('visa-virtual', 'card-50', 'Visa Virtual $50', 50),
  usdProduct('visa-virtual', 'card-100', 'Visa Virtual $100', 100),
  usdProduct('visa-virtual', 'card-200', 'Visa Virtual $200', 200),
  usdProduct('visa-virtual', 'card-300', 'Visa Virtual $300', 300),
  usdProduct('visa-virtual', 'card-500', 'Visa Virtual $500', 500),
  usdProduct('visa-virtual', 'card-1000', 'Visa Virtual $1000', 1000),
  usdProduct('visa-virtual', 'card-20', 'Visa Virtual $20', 20),
  usdProduct('visa-virtual', 'card-30', 'Visa Virtual $30', 30),
  usdProduct('visa-virtual', 'card-40', 'Visa Virtual $40', 40),
  usdProduct('visa-virtual', 'card-75', 'Visa Virtual $75', 75),
  usdProduct('visa-virtual', 'card-150', 'Visa Virtual $150', 150),
  usdProduct('visa-virtual', 'card-250', 'Visa Virtual $250', 250),
  usdProduct('visa-virtual', 'card-750', 'Visa Virtual $750', 750),
  usdProduct('visa-virtual', 'prepaid-25', 'Prepaid Visa $25', 25),
  usdProduct('visa-virtual', 'prepaid-50', 'Prepaid Visa $50', 50),
  usdProduct('visa-virtual', 'prepaid-100', 'Prepaid Visa $100', 100),
];

// ============================================================
// 24. Mastercard Virtual (providerId: 'mastercard-virtual')
// ============================================================
const mastercardVirtualProducts: ProductItem[] = [
  usdProduct('mastercard-virtual', 'card-5', 'Mastercard Virtual $5', 5),
  usdProduct('mastercard-virtual', 'card-10', 'Mastercard Virtual $10', 10),
  usdProduct('mastercard-virtual', 'card-15', 'Mastercard Virtual $15', 15),
  usdProduct('mastercard-virtual', 'card-25', 'Mastercard Virtual $25', 25),
  usdProduct('mastercard-virtual', 'card-50', 'Mastercard Virtual $50', 50),
  usdProduct('mastercard-virtual', 'card-100', 'Mastercard Virtual $100', 100),
  usdProduct('mastercard-virtual', 'card-200', 'Mastercard Virtual $200', 200),
  usdProduct('mastercard-virtual', 'card-300', 'Mastercard Virtual $300', 300),
  usdProduct('mastercard-virtual', 'card-500', 'Mastercard Virtual $500', 500),
  usdProduct('mastercard-virtual', 'card-1000', 'Mastercard Virtual $1000', 1000),
  usdProduct('mastercard-virtual', 'card-20', 'Mastercard Virtual $20', 20),
  usdProduct('mastercard-virtual', 'card-30', 'Mastercard Virtual $30', 30),
  usdProduct('mastercard-virtual', 'card-40', 'Mastercard Virtual $40', 40),
  usdProduct('mastercard-virtual', 'card-75', 'Mastercard Virtual $75', 75),
  usdProduct('mastercard-virtual', 'card-150', 'Mastercard Virtual $150', 150),
  usdProduct('mastercard-virtual', 'card-250', 'Mastercard Virtual $250', 250),
  usdProduct('mastercard-virtual', 'card-750', 'Mastercard Virtual $750', 750),
  usdProduct('mastercard-virtual', 'prepaid-25', 'Prepaid Mastercard $25', 25),
  usdProduct('mastercard-virtual', 'prepaid-50', 'Prepaid Mastercard $50', 50),
  usdProduct('mastercard-virtual', 'prepaid-100', 'Prepaid Mastercard $100', 100),
];

// ============================================================
// 25. PayPal (providerId: 'paypal')
// ============================================================
const paypalProducts: ProductItem[] = [
  usdProduct('paypal', 'card-5', 'PayPal $5', 5),
  usdProduct('paypal', 'card-10', 'PayPal $10', 10),
  usdProduct('paypal', 'card-15', 'PayPal $15', 15),
  usdProduct('paypal', 'card-25', 'PayPal $25', 25),
  usdProduct('paypal', 'card-50', 'PayPal $50', 50),
  usdProduct('paypal', 'card-100', 'PayPal $100', 100),
  usdProduct('paypal', 'card-200', 'PayPal $200', 200),
  usdProduct('paypal', 'card-300', 'PayPal $300', 300),
  usdProduct('paypal', 'card-500', 'PayPal $500', 500),
  usdProduct('paypal', 'card-1000', 'PayPal $1000', 1000),
  usdProduct('paypal', 'card-20', 'PayPal $20', 20),
  usdProduct('paypal', 'card-30', 'PayPal $30', 30),
  usdProduct('paypal', 'card-40', 'PayPal $40', 40),
  usdProduct('paypal', 'card-75', 'PayPal $75', 75),
  usdProduct('paypal', 'card-150', 'PayPal $150', 150),
  usdProduct('paypal', 'card-250', 'PayPal $250', 250),
  usdProduct('paypal', 'card-750', 'PayPal $750', 750),
  usdProduct('paypal', 'gift-25', 'Gift Card $25', 25),
  usdProduct('paypal', 'gift-50', 'Gift Card $50', 50),
  usdProduct('paypal', 'gift-100', 'Gift Card $100', 100),
];

// ============================================================
// 26. EA FC 25 (providerId: 'ea-fc')
// ============================================================
const eaFcProducts: ProductItem[] = [
  usdProduct('ea-fc', 'points-500', '500 FC Points', 4.99),
  usdProduct('ea-fc', 'points-1050', '1050 FC Points', 9.99),
  usdProduct('ea-fc', 'points-1600', '1600 FC Points', 14.99),
  usdProduct('ea-fc', 'points-2800', '2800 FC Points', 24.99),
  usdProduct('ea-fc', 'points-4600', '4600 FC Points', 39.99),
  usdProduct('ea-fc', 'points-7300', '7300 FC Points', 59.99),
  usdProduct('ea-fc', 'points-12000', '12000 FC Points', 99.99),
  usdProduct('ea-fc', 'points-160-bonus', '160 FC Points Bonus', 1.99),
  usdProduct('ea-fc', 'ultimate-edition', 'Ultimate Edition Upgrade', 29.99),
  usdProduct('ea-fc', 'standard-edition', 'Standard Edition', 59.99),
  usdProduct('ea-fc', 'points-300-bonus', '300 FC Points Bonus', 2.99),
  usdProduct('ea-fc', 'points-750-bonus', '750 FC Points Bonus', 6.99),
  usdProduct('ea-fc', 'points-2000-bonus', '2000 FC Points Bonus', 17.99),
  usdProduct('ea-fc', 'points-3500-bonus', '3500 FC Points Bonus', 29.99),
  usdProduct('ea-fc', 'season-pass', 'Season Pass', 19.99),
  usdProduct('ea-fc', 'hero-pack', 'Hero Pack', 14.99),
  usdProduct('ea-fc', 'starter-pack', 'Starter Pack', 4.99),
  usdProduct('ea-fc', 'pro-pack', 'Pro Pack', 9.99),
  usdProduct('ea-fc', 'mega-pack', 'Mega Pack', 19.99),
  usdProduct('ea-fc', 'legend-pack', 'Legend Pack', 29.99),
];

// ============================================================
// 27. Apex Legends (providerId: 'apex-legends')
// ============================================================
const apexLegendsProducts: ProductItem[] = [
  usdProduct('apex-legends', 'coins-1000', '1000 Apex Coins', 9.99),
  usdProduct('apex-legends', 'coins-2150', '2150 Apex Coins', 19.99),
  usdProduct('apex-legends', 'coins-3350', '3350 Apex Coins', 29.99),
  usdProduct('apex-legends', 'coins-4350', '4350 Apex Coins', 39.99),
  usdProduct('apex-legends', 'coins-6700', '6700 Apex Coins', 59.99),
  usdProduct('apex-legends', 'coins-11500', '11500 Apex Coins', 99.99),
  usdProduct('apex-legends', 'battle-pass', 'Battle Pass', 9.99),
  usdProduct('apex-legends', 'battle-pass-bundle', 'Battle Pass Bundle', 24.99),
  usdProduct('apex-legends', 'coins-500-bonus', '500 Apex Coins Bonus', 4.99),
  usdProduct('apex-legends', 'starter-pack', 'Starter Pack', 4.99),
  usdProduct('apex-legends', 'legend-edition', 'Legend Edition', 19.99),
  usdProduct('apex-legends', 'legend-pack', 'Legend Pack', 7.99),
  usdProduct('apex-legends', 'skin-pack-1', 'Weapon Skin Pack', 4.99),
  usdProduct('apex-legends', 'skin-pack-2', 'Legendary Skin Pack', 14.99),
  usdProduct('apex-legends', 'charm-pack', 'Gun Charm Pack', 2.99),
  usdProduct('apex-legends', 'banner-pack', 'Banner Frame Pack', 1.99),
  usdProduct('apex-legends', 'emote-pack', 'Emote Pack', 2.99),
  usdProduct('apex-legends', 'seasonal-pack', 'Seasonal Pack', 9.99),
  usdProduct('apex-legends', 'anniversary-pack', 'Anniversary Pack', 14.99),
  usdProduct('apex-legends', 'pro-pack', 'Pro Pack', 24.99),
];

// ============================================================
// 28. Yemen Mobile (providerId: 'yemen-mobile')
// ============================================================
const yemenMobileProducts: ProductItem[] = [
  yerProduct('yemen-mobile', 'charge-100', 'شحنة 100 ر.ي', 100),
  yerProduct('yemen-mobile', 'charge-200', 'شحنة 200 ر.ي', 200),
  yerProduct('yemen-mobile', 'charge-300', 'شحنة 300 ر.ي', 300),
  yerProduct('yemen-mobile', 'charge-500', 'شحنة 500 ر.ي', 500),
  yerProduct('yemen-mobile', 'charge-1000', 'شحنة 1000 ر.ي', 1000),
  yerProduct('yemen-mobile', 'charge-2000', 'شحنة 2000 ر.ي', 2000),
  yerProduct('yemen-mobile', 'charge-3000', 'شحنة 3000 ر.ي', 3000),
  yerProduct('yemen-mobile', 'charge-5000', 'شحنة 5000 ر.ي', 5000),
  yerProduct('yemen-mobile', 'net-1gb', 'باقة فورجي 1 جيجا', 200),
  yerProduct('yemen-mobile', 'net-2gb', 'باقة فورجي 2 جيجا', 350),
  yerProduct('yemen-mobile', 'net-4gb', 'باقة فورجي 4 جيجا', 500),
  yerProduct('yemen-mobile', 'net-10gb', 'باقة فورجي 10 جيجا', 1000),
  yerProduct('yemen-mobile', 'net-20gb', 'باقة فورجي 20 جيجا', 1800),
  yerProduct('yemen-mobile', 'net-unlimited-day', 'باقة فورجي غير محدودة يوم', 300),
  yerProduct('yemen-mobile', 'net-unlimited-week', 'باقة فورجي غير محدودة أسبوع', 700),
  yerProduct('yemen-mobile', 'net-unlimited-month', 'باقة فورجي غير محدودة شهر', 2000),
  yerProduct('yemen-mobile', 'call-30min', 'باقة مكالمات 30 دقيقة', 100),
  yerProduct('yemen-mobile', 'call-60min', 'باقة مكالمات 60 دقيقة', 180),
  yerProduct('yemen-mobile', 'call-120min', 'باقة مكالمات 120 دقيقة', 300),
  yerProduct('yemen-mobile', 'sms-50', 'باقة رسائل 50 رسالة', 50),
];

// ============================================================
// 29. Yo (providerId: 'yo')
// ============================================================
const yoProducts: ProductItem[] = [
  yerProduct('yo', 'charge-100', 'شحنة 100 ر.ي', 100),
  yerProduct('yo', 'charge-200', 'شحنة 200 ر.ي', 200),
  yerProduct('yo', 'charge-300', 'شحنة 300 ر.ي', 300),
  yerProduct('yo', 'charge-500', 'شحنة 500 ر.ي', 500),
  yerProduct('yo', 'charge-1000', 'شحنة 1000 ر.ي', 1000),
  yerProduct('yo', 'charge-2000', 'شحنة 2000 ر.ي', 2000),
  yerProduct('yo', 'charge-3000', 'شحنة 3000 ر.ي', 3000),
  yerProduct('yo', 'charge-5000', 'شحنة 5000 ر.ي', 5000),
  yerProduct('yo', 'net-2gb', 'باقة إنترنت 2 جيجا', 300),
  yerProduct('yo', 'net-5gb', 'باقة إنترنت 5 جيجا', 600),
  yerProduct('yo', 'net-10gb', 'باقة إنترنت 10 جيجا', 1000),
  yerProduct('yo', 'net-20gb', 'باقة إنترنت 20 جيجا', 1800),
  yerProduct('yo', 'net-unlimited-day', 'باقة إنترنت غير محدودة يوم', 250),
  yerProduct('yo', 'net-unlimited-week', 'باقة إنترنت غير محدودة أسبوع', 650),
  yerProduct('yo', 'net-unlimited-month', 'باقة إنترنت غير محدودة شهر', 1800),
  yerProduct('yo', 'call-30min', 'باقة مكالمات 30 دقيقة', 100),
  yerProduct('yo', 'call-60min', 'باقة مكالمات 60 دقيقة', 180),
  yerProduct('yo', 'call-120min', 'باقة مكالمات 120 دقيقة', 300),
  yerProduct('yo', 'sms-50', 'باقة رسائل 50 رسالة', 50),
  yerProduct('yo', 'sms-100', 'باقة رسائل 100 رسالة', 90),
];

// ============================================================
// 30. Sabafon (providerId: 'sabafon')
// ============================================================
const sabafonProducts: ProductItem[] = [
  yerProduct('sabafon', 'charge-100', 'شحنة 100 ر.ي', 100),
  yerProduct('sabafon', 'charge-200', 'شحنة 200 ر.ي', 200),
  yerProduct('sabafon', 'charge-300', 'شحنة 300 ر.ي', 300),
  yerProduct('sabafon', 'charge-500', 'شحنة 500 ر.ي', 500),
  yerProduct('sabafon', 'charge-1000', 'شحنة 1000 ر.ي', 1000),
  yerProduct('sabafon', 'charge-2000', 'شحنة 2000 ر.ي', 2000),
  yerProduct('sabafon', 'charge-3000', 'شحنة 3000 ر.ي', 3000),
  yerProduct('sabafon', 'charge-5000', 'شحنة 5000 ر.ي', 5000),
  yerProduct('sabafon', 'net-3gb', 'باقة إنترنت 3 جيجا', 400),
  yerProduct('sabafon', 'net-5gb', 'باقة إنترنت 5 جيجا', 600),
  yerProduct('sabafon', 'net-10gb', 'باقة إنترنت 10 جيجا', 1000),
  yerProduct('sabafon', 'net-20gb', 'باقة إنترنت 20 جيجا', 1800),
  yerProduct('sabafon', 'net-unlimited-day', 'باقة إنترنت غير محدودة يوم', 250),
  yerProduct('sabafon', 'net-unlimited-week', 'باقة إنترنت غير محدودة أسبوع', 600),
  yerProduct('sabafon', 'net-unlimited-month', 'باقة إنترنت غير محدودة شهر', 1600),
  yerProduct('sabafon', 'call-30min', 'باقة مكالمات 30 دقيقة', 120),
  yerProduct('sabafon', 'call-60min', 'باقة مكالمات 60 دقيقة', 200),
  yerProduct('sabafon', 'call-120min', 'باقة مكالمات 120 دقيقة', 350),
  yerProduct('sabafon', 'sms-50', 'باقة رسائل 50 رسالة', 60),
  yerProduct('sabafon', 'sms-100', 'باقة رسائل 100 رسالة', 100),
];

// ============================================================
// 31. Y (providerId: 'y')
// ============================================================
const yProviderProducts: ProductItem[] = [
  yerProduct('y', 'charge-100', 'شحنة 100 ر.ي', 100),
  yerProduct('y', 'charge-200', 'شحنة 200 ر.ي', 200),
  yerProduct('y', 'charge-300', 'شحنة 300 ر.ي', 300),
  yerProduct('y', 'charge-500', 'شحنة 500 ر.ي', 500),
  yerProduct('y', 'charge-1000', 'شحنة 1000 ر.ي', 1000),
  yerProduct('y', 'charge-2000', 'شحنة 2000 ر.ي', 2000),
  yerProduct('y', 'charge-3000', 'شحنة 3000 ر.ي', 3000),
  yerProduct('y', 'charge-5000', 'شحنة 5000 ر.ي', 5000),
  yerProduct('y', 'net-2gb', 'باقة إنترنت 2 جيجا', 250),
  yerProduct('y', 'net-5gb', 'باقة إنترنت 5 جيجا', 500),
  yerProduct('y', 'net-10gb', 'باقة إنترنت 10 جيجا', 900),
  yerProduct('y', 'net-20gb', 'باقة إنترنت 20 جيجا', 1600),
  yerProduct('y', 'net-unlimited-day', 'باقة إنترنت غير محدودة يوم', 200),
  yerProduct('y', 'net-unlimited-week', 'باقة إنترنت غير محدودة أسبوع', 550),
  yerProduct('y', 'net-unlimited-month', 'باقة إنترنت غير محدودة شهر', 1500),
  yerProduct('y', 'call-30min', 'باقة مكالمات 30 دقيقة', 100),
  yerProduct('y', 'call-60min', 'باقة مكالمات 60 دقيقة', 180),
  yerProduct('y', 'call-120min', 'باقة مكالمات 120 دقيقة', 300),
  yerProduct('y', 'sms-50', 'باقة رسائل 50 رسالة', 50),
  yerProduct('y', 'sms-100', 'باقة رسائل 100 رسالة', 90),
];

// ============================================================
// 32. Yemen Net (providerId: 'yemen-net')
// ============================================================
const yemenNetProducts: ProductItem[] = [
  yerProduct('yemen-net', 'net-1gb-day', 'باقة 1 جيجا - يوم', 150),
  yerProduct('yemen-net', 'net-3gb-day', 'باقة 3 جيجا - يوم', 300),
  yerProduct('yemen-net', 'net-5gb-week', 'باقة 5 جيجا - أسبوع', 500),
  yerProduct('yemen-net', 'net-10gb-month', 'باقة 10 جيجا - شهر', 1000),
  yerProduct('yemen-net', 'net-20gb-month', 'باقة 20 جيجا - شهر', 1800),
  yerProduct('yemen-net', 'net-30gb-month', 'باقة 30 جيجا - شهر', 2500),
  yerProduct('yemen-net', 'net-50gb-month', 'باقة 50 جيجا - شهر', 4000),
  yerProduct('yemen-net', 'net-100gb-month', 'باقة 100 جيجا - شهر', 7000),
  yerProduct('yemen-net', 'net-unlimited-1m', 'باقة غير محدودة شهر', 3000),
  yerProduct('yemen-net', 'net-unlimited-3m', 'باقة غير محدودة 3 أشهر', 8000),
  yerProduct('yemen-net', 'net-unlimited-6m', 'باقة غير محدودة 6 أشهر', 14000),
  yerProduct('yemen-net', 'net-unlimited-1y', 'باقة غير محدودة سنة', 25000),
];

// ============================================================
// 33. Electricity and Water
// ============================================================
const elecSanaaProducts: ProductItem[] = [
  yerProduct('elec-sanaa', 'bill-500', 'فاتورة كهرباء 500 ر.ي', 500),
  yerProduct('elec-sanaa', 'bill-1000', 'فاتورة كهرباء 1000 ر.ي', 1000),
  yerProduct('elec-sanaa', 'bill-2000', 'فاتورة كهرباء 2000 ر.ي', 2000),
  yerProduct('elec-sanaa', 'bill-3000', 'فاتورة كهرباء 3000 ر.ي', 3000),
  yerProduct('elec-sanaa', 'bill-5000', 'فاتورة كهرباء 5000 ر.ي', 5000),
  yerProduct('elec-sanaa', 'bill-10000', 'فاتورة كهرباء 10000 ر.ي', 10000),
  yerProduct('elec-sanaa', 'bill-20000', 'فاتورة كهرباء 20000 ر.ي', 20000),
  yerProduct('elec-sanaa', 'bill-50000', 'فاتورة كهرباء 50000 ر.ي', 50000),
];

const elecAdenProducts: ProductItem[] = [
  yerProduct('elec-aden', 'bill-500', 'فاتورة كهرباء 500 ر.ي', 500),
  yerProduct('elec-aden', 'bill-1000', 'فاتورة كهرباء 1000 ر.ي', 1000),
  yerProduct('elec-aden', 'bill-2000', 'فاتورة كهرباء 2000 ر.ي', 2000),
  yerProduct('elec-aden', 'bill-3000', 'فاتورة كهرباء 3000 ر.ي', 3000),
  yerProduct('elec-aden', 'bill-5000', 'فاتورة كهرباء 5000 ر.ي', 5000),
  yerProduct('elec-aden', 'bill-10000', 'فاتورة كهرباء 10000 ر.ي', 10000),
  yerProduct('elec-aden', 'bill-20000', 'فاتورة كهرباء 20000 ر.ي', 20000),
  yerProduct('elec-aden', 'bill-50000', 'فاتورة كهرباء 50000 ر.ي', 50000),
];

const waterSanaaProducts: ProductItem[] = [
  yerProduct('water-sanaa', 'bill-500', 'فاتورة مياه 500 ر.ي', 500),
  yerProduct('water-sanaa', 'bill-1000', 'فاتورة مياه 1000 ر.ي', 1000),
  yerProduct('water-sanaa', 'bill-2000', 'فاتورة مياه 2000 ر.ي', 2000),
  yerProduct('water-sanaa', 'bill-3000', 'فاتورة مياه 3000 ر.ي', 3000),
  yerProduct('water-sanaa', 'bill-5000', 'فاتورة مياه 5000 ر.ي', 5000),
  yerProduct('water-sanaa', 'bill-10000', 'فاتورة مياه 10000 ر.ي', 10000),
];

const waterAdenProducts: ProductItem[] = [
  yerProduct('water-aden', 'bill-500', 'فاتورة مياه 500 ر.ي', 500),
  yerProduct('water-aden', 'bill-1000', 'فاتورة مياه 1000 ر.ي', 1000),
  yerProduct('water-aden', 'bill-2000', 'فاتورة مياه 2000 ر.ي', 2000),
  yerProduct('water-aden', 'bill-3000', 'فاتورة مياه 3000 ر.ي', 3000),
  yerProduct('water-aden', 'bill-5000', 'فاتورة مياه 5000 ر.ي', 5000),
  yerProduct('water-aden', 'bill-10000', 'فاتورة مياه 10000 ر.ي', 10000),
];

// ============================================================
// 34. Internet providers
// ============================================================
const yNetInternetProducts: ProductItem[] = [
  yerProduct('y-net-internet', 'net-2gb', 'باقة إنترنت 2 جيجا', 300),
  yerProduct('y-net-internet', 'net-5gb', 'باقة إنترنت 5 جيجا', 550),
  yerProduct('y-net-internet', 'net-10gb', 'باقة إنترنت 10 جيجا', 950),
  yerProduct('y-net-internet', 'net-20gb', 'باقة إنترنت 20 جيجا', 1700),
  yerProduct('y-net-internet', 'net-unlimited-day', 'باقة غير محدودة يوم', 200),
  yerProduct('y-net-internet', 'net-unlimited-week', 'باقة غير محدودة أسبوع', 550),
  yerProduct('y-net-internet', 'net-unlimited-month', 'باقة غير محدودة شهر', 1500),
];

const sabafonInternetProducts: ProductItem[] = [
  yerProduct('sabafon-internet', 'net-3gb', 'باقة إنترنت 3 جيجا', 400),
  yerProduct('sabafon-internet', 'net-5gb', 'باقة إنترنت 5 جيجا', 600),
  yerProduct('sabafon-internet', 'net-10gb', 'باقة إنترنت 10 جيجا', 1000),
  yerProduct('sabafon-internet', 'net-20gb', 'باقة إنترنت 20 جيجا', 1800),
  yerProduct('sabafon-internet', 'net-unlimited-day', 'باقة غير محدودة يوم', 250),
  yerProduct('sabafon-internet', 'net-unlimited-week', 'باقة غير محدودة أسبوع', 600),
  yerProduct('sabafon-internet', 'net-unlimited-month', 'باقة غير محدودة شهر', 1600),
];

// ============================================================
// 35. Government services
// ============================================================
const civilRegistryProducts: ProductItem[] = [
  yerProduct('civil-registry', 'id-renewal', 'تجديد بطاقة شخصية', 2000),
  yerProduct('civil-registry', 'id-new', 'إصدار بطاقة شخصية جديدة', 3000),
  yerProduct('civil-registry', 'id-duplicate', 'بدل فاقد بطاقة شخصية', 4000),
  yerProduct('civil-registry', 'birth-cert', 'شهادة ميلاد', 1500),
  yerProduct('civil-registry', 'death-cert', 'شهادة وفاة', 1500),
  yerProduct('civil-registry', 'marriage-cert', 'عقد زواج', 2000),
  yerProduct('civil-registry', 'family-card', 'بطاقة عائلية', 2000),
];

const passportProducts: ProductItem[] = [
  yerProduct('passport', 'passport-new', 'جواز سفر جديد', 10000),
  yerProduct('passport', 'passport-renewal', 'تجديد جواز سفر', 8000),
  yerProduct('passport', 'passport-duplicate', 'بدل فاقد جواز سفر', 12000),
  yerProduct('passport', 'passport-urgent', 'جواز سفر مستعجل', 15000),
];

const trafficProducts: ProductItem[] = [
  yerProduct('traffic', 'license-new', 'رخصة قيادة جديدة', 5000),
  yerProduct('traffic', 'license-renewal', 'تجديد رخصة قيادة', 3000),
  yerProduct('traffic', 'license-intl', 'رخصة قيادة دولية', 5000),
  yerProduct('traffic', 'car-registration', 'تسجيل مركبة', 4000),
  yerProduct('traffic', 'car-renewal', 'تججيل تسجيل مركبة', 2000),
  yerProduct('traffic', 'fine-payment', 'سداد مخالفة مرورية', 1000),
];

const municipalProducts: ProductItem[] = [
  yerProduct('municipal', 'license-commercial', 'رخصة تجارية', 5000),
  yerProduct('municipal', 'license-industrial', 'رخصة صناعية', 7000),
  yerProduct('municipal', 'license-professional', 'رخصة حرفية', 3000),
  yerProduct('municipal', 'building-permit', 'رخصة بناء', 10000),
  yerProduct('municipal', 'license-renewal', 'تجديد رخصة', 2000),
];

// ============================================================
// ALL PRODUCTS COMBINED
// ============================================================
export const allProducts: ProductItem[] = [
  ...pubgProducts,
  ...freefireProducts,
  ...callOfDutyProducts,
  ...clashRoyaleProducts,
  ...clashOfClansProducts,
  ...robloxProducts,
  ...fortniteProducts,
  ...minecraftProducts,
  ...valorantProducts,
  ...leagueLegendsProducts,
  ...genshinImpactProducts,
  ...honkaiStarProducts,
  ...steamProducts,
  ...netflixProducts,
  ...spotifyProducts,
  ...youtubePremiumProducts,
  ...googlePlayProducts,
  ...itunesProducts,
  ...amazonProducts,
  ...psnProducts,
  ...xboxProducts,
  ...nintendoProducts,
  ...visaVirtualProducts,
  ...mastercardVirtualProducts,
  ...paypalProducts,
  ...eaFcProducts,
  ...apexLegendsProducts,
  ...yemenMobileProducts,
  ...yoProducts,
  ...sabafonProducts,
  ...yProviderProducts,
  ...yemenNetProducts,
  ...elecSanaaProducts,
  ...elecAdenProducts,
  ...waterSanaaProducts,
  ...waterAdenProducts,
  ...yNetInternetProducts,
  ...sabafonInternetProducts,
  ...civilRegistryProducts,
  ...passportProducts,
  ...trafficProducts,
  ...municipalProducts,
];
