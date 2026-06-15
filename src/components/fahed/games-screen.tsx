'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Search, Gamepad2, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Globe, ShoppingCart, Star, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ref, push, set, update, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { getApiProvider, getCachedProviderData, type ApiGame, type ApiGameCatalogue, type ApiGameFields, type ApiGameServer } from '@/lib/api-providers';
import { subscribeToCategories, type DynamicCategory } from '@/lib/categories';
import { checkPlayerId, getGameCatalogue, getGameFields, getGameServers, placeGameOrder, checkGameOrderStatus } from '@/lib/api-providers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function GamesScreen() {
  const { user, navigateBack, categories } = useStore();
  const [games, setGames] = useState<ApiGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<ApiGame | null>(null);
  const [catalogue, setCatalogue] = useState<ApiGameCatalogue[]>([]);
  const [gameFields, setGameFields] = useState<ApiGameFields | null>(null);
  const [gameServers, setGameServers] = useState<ApiGameServer>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>('');
  const [purchasing, setPurchasing] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  // Load games from active API provider
  useEffect(() => {
    const loadGames = async () => {
      // Find the category with api-games screenType
      const gamesCategory = categories.find(c => c.screenType === 'api-games');
      const pId = gamesCategory?.apiProviderId;

      if (!pId) {
        // Try to find any enabled provider that supports games
        const snapshot = await get(ref(database, 'apiProviders'));
        if (snapshot.exists()) {
          const providers = Object.entries(snapshot.val()).map(([id, val]: [string, any]) => ({ id, ...val }));
          const gamesProvider = providers.find((p: any) => p.enabled && p.supportsGames);
          if (gamesProvider) {
            setProviderId(gamesProvider.id);
            const cache = await getCachedProviderData(gamesProvider.id);
            setGames(Object.values(cache.games));
          }
        }
      } else {
        setProviderId(pId);
        const cache = await getCachedProviderData(pId);
        setGames(Object.values(cache.games));
      }
      setLoading(false);
    };
    loadGames();
  }, [categories]);

  const filteredGames = games.filter(g =>
    g.enabled !== false &&
    (searchQuery ? g.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  const handleSelectGame = async (game: ApiGame) => {
    setSelectedGame(game);
    setCatalogue([]);
    setGameFields(null);
    setGameServers({});

    if (!providerId) return;

    try {
      const provider = await getApiProvider(providerId);
      if (!provider) return;

      const [cat, fields, servers] = await Promise.all([
        getGameCatalogue(provider, game.code),
        getGameFields(provider, game.code).catch(() => ({ fields: [], notes: '' })),
        getGameServers(provider, game.code).catch(() => ({})),
      ]);

      setCatalogue(cat);
      setGameFields(fields);
      setGameServers(servers);
    } catch (error: any) {
      toast.error(`فشل تحميل بيانات اللعبة: ${error.message}`);
    }
  };

  const handleBack = () => {
    if (selectedGame) {
      setSelectedGame(null);
      setCatalogue([]);
      setGameFields(null);
      setGameServers({});
    } else {
      navigateBack();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy-gradient px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 glass rounded-xl">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">
              {selectedGame ? selectedGame.name : 'الألعاب'}
            </h1>
            {selectedGame && (
              <p className="text-white/50 text-xs">{catalogue.length} باقة متاحة</p>
            )}
          </div>
        </div>

        {/* Search */}
        {!selectedGame && (
          <div className="relative mt-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن لعبة..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 pr-10 text-white placeholder:text-white/40 text-sm"
            />
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        {selectedGame ? (
          <GamePurchaseView
            game={selectedGame}
            catalogue={catalogue}
            gameFields={gameFields}
            gameServers={gameServers}
            providerId={providerId}
            user={user}
            onBack={() => { setSelectedGame(null); setCatalogue([]); setGameFields(null); setGameServers({}); }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredGames.map((game) => (
              <button
                key={game.code}
                onClick={() => handleSelectGame(game)}
                className="glass-card rounded-2xl p-4 card-press text-center"
              >
                {game.image_url ? (
                  <img
                    src={game.image_url.startsWith('http') ? game.image_url : `https://api.g2bulk.com${game.image_url}`}
                    alt={game.name}
                    className="w-16 h-16 rounded-xl mx-auto mb-2 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                    <Gamepad2 className="h-8 w-8 text-red-500" />
                  </div>
                )}
                <p className="text-sm font-medium truncate">{game.name}</p>
              </button>
            ))}
            {filteredGames.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد ألعاب متاحة</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Result Modal */}
      <AnimatePresence>
        {orderResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setOrderResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                {orderResult.success ? (
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                ) : (
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-3" />
                )}
                <h3 className="text-lg font-bold mb-2">{orderResult.success ? 'تم بنجاح' : 'فشل العملية'}</h3>
                <p className="text-sm text-muted-foreground mb-4">{orderResult.message}</p>
                {orderResult.deliveryItems && (
                  <div className="bg-green-500/10 rounded-xl p-3 mb-4 border border-green-500/30">
                    <p className="text-xs text-muted-foreground mb-1">الكود:</p>
                    <p className="text-lg font-mono font-bold text-green-500">{orderResult.deliveryItems[0]}</p>
                  </div>
                )}
                <Button onClick={() => setOrderResult(null)} className="w-full">حسناً</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Game Purchase View =====
function GamePurchaseView({
  game,
  catalogue,
  gameFields,
  gameServers,
  providerId,
  user,
  onBack,
}: {
  game: ApiGame;
  catalogue: ApiGameCatalogue[];
  gameFields: ApiGameFields | null;
  gameServers: ApiGameServer;
  providerId: string;
  user: any;
  onBack: () => void;
}) {
  const [playerId, setPlayerId] = useState('');
  const [serverId, setServerId] = useState('');
  const [selectedCatalogue, setSelectedCatalogue] = useState<ApiGameCatalogue | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [playerValid, setPlayerValid] = useState<{ valid: boolean; name?: string } | null>(null);

  const handleValidatePlayer = async () => {
    if (!playerId || !providerId) return;
    setValidating(true);
    try {
      const provider = await getApiProvider(providerId);
      if (!provider) return;
      const result = await checkPlayerId(provider, game.code, playerId, serverId || undefined);
      setPlayerValid(result);
      if (result.valid) {
        toast.success(`اللاعب: ${result.name}`);
      } else {
        toast.error('معرف اللاعب غير صالح');
      }
    } catch (error: any) {
      toast.error(`فشل التحقق: ${error.message}`);
    }
    setValidating(false);
  };

  const handlePurchase = async () => {
    if (!user || !selectedCatalogue || !playerId || !providerId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (playerValid && !playerValid.valid) {
      toast.error('يرجى التحقق من معرف اللاعب أولاً');
      return;
    }

    setPurchasing(true);
    try {
      const provider = await getApiProvider(providerId);
      if (!provider) throw new Error('المزود غير متاح');

      const markup = provider.markupPercent || 0;
      const finalPrice = selectedCatalogue.amount * (1 + markup / 100);

      // Check balance
      const userBalance = user.balances?.USD || 0;
      if (userBalance < finalPrice) {
        toast.error('رصيدك غير كافي');
        setPurchasing(false);
        return;
      }

      const result = await placeGameOrder(
        provider,
        game.code,
        selectedCatalogue.name,
        playerId,
        serverId || undefined
      );

      if (result.success) {
        // Deduct balance
        await update(ref(database, `users/${user.id}`), {
          'balances/USD': userBalance - finalPrice,
        });

        // Save order
        const orderRef = push(ref(database, `users/${user.id}/orders`));
        await set(orderRef, {
          type: 'game_topup',
          gameCode: game.code,
          gameName: game.name,
          catalogueName: selectedCatalogue.name,
          playerId,
          serverId: serverId || '',
          unitPrice: selectedCatalogue.amount,
          finalPrice,
          markup,
          status: result.order.status === 'PENDING' ? 'pending' : 'processing',
          providerOrderId: result.order.order_id,
          createdAt: new Date().toISOString(),
        });

        toast.success(result.message || 'تم إنشاء الطلب بنجاح');

        // If pending, start polling
        if (result.order.status === 'PENDING' && result.order.order_id) {
          pollOrderStatus(result.order.order_id, game.code, provider, user.id);
        }
      }
    } catch (error: any) {
      toast.error(`فشل الشراء: ${error.message}`);
    }
    setPurchasing(false);
  };

  const pollOrderStatus = async (orderId: number, gameCode: string, provider: any, userId: string) => {
    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) { clearInterval(interval); return; }
      try {
        const status = await checkGameOrderStatus(provider, orderId, gameCode);
        if (status.status === 'COMPLETED') {
          clearInterval(interval);
          toast.success('تم تسليم الطلب بنجاح!');
        } else if (status.status === 'FAILED') {
          clearInterval(interval);
          toast.error('فشل الطلب وتم استرداد المبلغ');
        }
      } catch {}
    }, 10000);
  };

  return (
    <div className="space-y-4">
      {/* Game Info */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
        {game.image_url ? (
          <img
            src={game.image_url.startsWith('http') ? game.image_url : `https://api.g2bulk.com${game.image_url}`}
            alt={game.name}
            className="w-16 h-16 rounded-xl object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-red-500" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold">{game.name}</h2>
          {gameFields?.notes && (
            <p className="text-xs text-muted-foreground mt-1">{gameFields.notes}</p>
          )}
        </div>
      </div>

      {/* Player ID Input */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold">بيانات اللاعب</h3>
        {(gameFields?.fields || []).includes('userid') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">معرف اللاعب (Player ID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerId}
                onChange={(e) => { setPlayerId(e.target.value); setPlayerValid(null); }}
                placeholder="أدخل معرف اللاعب"
                className="flex-1 px-3 py-2.5 bg-muted rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/30"
                dir="ltr"
              />
              <button
                onClick={handleValidatePlayer}
                disabled={validating || !playerId}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحقق'}
              </button>
            </div>
            {playerValid && (
              <p className={`text-xs mt-1 ${playerValid.valid ? 'text-green-500' : 'text-red-500'}`}>
                {playerValid.valid ? `✓ ${playerValid.name}` : '✗ معرف غير صالح'}
              </p>
            )}
          </div>
        )}
        {(gameFields?.fields || []).includes('serverid') && Object.keys(gameServers).length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">السيرفر</label>
            <select
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-none"
            >
              <option value="">اختر السيرفر</option>
              {Object.entries(gameServers).map(([name, id]) => (
                <option key={name} value={id || name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Catalogue Selection */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold">اختر الباقة</h3>
        <div className="space-y-2">
          {catalogue.map((cat) => {
            const isSelected = selectedCatalogue?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatalogue(cat)}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span className="text-sm font-medium">{cat.name}</span>
                <span className="text-sm font-bold text-primary">${cat.amount.toFixed(2)}</span>
              </button>
            );
          })}
          {catalogue.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">لا توجد باقات متاحة</p>
          )}
        </div>
      </div>

      {/* Purchase Button */}
      {selectedCatalogue && (
        <button
          onClick={handlePurchase}
          disabled={purchasing || !playerId}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> جاري الشراء...</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> شراء ${selectedCatalogue.amount.toFixed(2)}</>
          )}
        </button>
      )}
    </div>
  );
}
