'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { useSupabaseSync } from '@/lib/use-supabase-sync';
import LoginScreen from '@/components/admin/login-screen';
import Sidebar from '@/components/admin/sidebar';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_ICON_BASE64 } from '@/lib/app-icon';

// Lazy loaded panel components
const Dashboard = lazy(() => import('@/components/admin/dashboard'));
const UsersPanel = lazy(() => import('@/components/admin/users-panel'));
const OrdersPanel = lazy(() => import('@/components/admin/orders-panel'));
const DepositPanel = lazy(() => import('@/components/admin/deposit-panel'));
const WithdrawPanel = lazy(() => import('@/components/admin/withdraw-panel'));
const KYCPanel = lazy(() => import('@/components/admin/kyc-panel'));
const ProvidersPanel = lazy(() => import('@/components/admin/providers-panel'));
const ApiProvidersPanel = lazy(() => import('@/components/admin/api-providers-panel'));
const WalletServicesPanel = lazy(() => import('@/components/admin/wallet-services-panel'));
const InstantRechargePanel = lazy(() => import('@/components/admin/instant-recharge-panel'));
const PackagesPanel = lazy(() => import('@/components/admin/packages-panel'));
const ExchangeRatesPanel = lazy(() => import('@/components/admin/exchange-rates-panel'));
const GiftCodesPanel = lazy(() => import('@/components/admin/gift-codes-panel'));
const PromoCodesPanel = lazy(() => import('@/components/admin/promo-codes-panel'));
const BannersPanel = lazy(() => import('@/components/admin/banners-panel'));
const BanksPanel = lazy(() => import('@/components/admin/banks-panel'));
const SupportTicketsPanel = lazy(() => import('@/components/admin/support-tickets-panel'));
const SupportLiveChatPanel = lazy(() => import('@/components/admin/support-livechat-panel'));
const LimitsPanel = lazy(() => import('@/components/admin/limits-panel'));
const SocialLinksPanel = lazy(() => import('@/components/admin/social-links-panel'));
const LegalContentPanel = lazy(() => import('@/components/admin/legal-content-panel'));
const SectionsPanel = lazy(() => import('@/components/admin/sections-panel'));
const VisibilityPanel = lazy(() => import('@/components/admin/visibility-panel'));
const ApiSettingsPanel = lazy(() => import('@/components/admin/api-settings-panel'));
const NotificationsPanel = lazy(() => import('@/components/admin/notifications-panel'));
const SettingsPanel = lazy(() => import('@/components/admin/settings-panel'));
const ActivityLogPanel = lazy(() => import('@/components/admin/activity-log-panel'));
const BackupPanel = lazy(() => import('@/components/admin/backup-panel'));
const CommissionsPanel = lazy(() => import('@/components/admin/commissions-panel'));
const InvestmentsPanel = lazy(() => import('@/components/admin/investments-panel'));
const UserGiftCodesPanel = lazy(() => import('@/components/admin/user-gift-codes-panel'));
const PushNotificationsPanel = lazy(() => import('@/components/admin/push-notifications-panel'));
const CardColorsPanel = lazy(() => import('@/components/admin/card-colors-panel'));
const BulkCodesPanel = lazy(() => import('@/components/admin/bulk-codes-panel'));
const CurrencyCardsPanel = lazy(() => import('@/components/admin/currency-cards-panel'));
const ServiceAnalyticsPanel = lazy(() => import('@/components/admin/service-analytics-panel'));
const MaintenancePanel = lazy(() => import('@/components/admin/maintenance-panel'));
const AboutPanel = lazy(() => import('@/components/admin/about-panel'));
const EmployeesPanel = lazy(() => import('@/components/admin/employees-panel'));
const BrandingPanel = lazy(() => import('@/components/admin/branding-panel'));
const WalletAddressesPanel = lazy(() => import('@/components/admin/wallet-addresses-panel'));
const OfficesPanel = lazy(() => import('@/components/admin/offices-panel'));
const ApiSyncPanel = lazy(() => import('@/components/admin/api-sync-panel'));
const TransfersPanel = lazy(() => import('@/components/admin/transfers-panel'));
const EscrowPanel = lazy(() => import('@/components/admin/escrow-panel'));
const BalanceLogPanel = lazy(() => import('@/components/admin/balance-log-panel'));
const PriceCustomizationPanel = lazy(() => import('@/components/admin/price-customization-panel'));
const CommissionConfigPanel = lazy(() => import('@/components/admin/commission-config-panel'));
const SubSectionsPanel = lazy(() => import('@/components/admin/sub-sections-panel'));
const UserReviewsPanel = lazy(() => import('@/components/admin/user-reviews-panel'));
const MarketingContentPanel = lazy(() => import('@/components/admin/marketing-content-panel'));
const BranchManagementPanel = lazy(() => import('@/components/admin/branch-management-panel'));
const CustomReportsPanel = lazy(() => import('@/components/admin/custom-reports-panel'));
const DataExportPanel = lazy(() => import('@/components/admin/data-export-panel'));
const DirectChatPanel = lazy(() => import('@/components/admin/direct-chat-panel'));

const panelMap: Record<string, React.ComponentType> = {
  // Dashboard
  dashboard: Dashboard,
  // Financial Operations
  deposit: DepositPanel,
  deposits: DepositPanel,
  withdraw: WithdrawPanel,
  withdrawals: WithdrawPanel,
  orders: OrdersPanel,
  transfers: TransfersPanel,
  escrow: EscrowPanel,
  commissions: CommissionsPanel,
  investments: InvestmentsPanel,
  // API Management
  'api-providers': ApiProvidersPanel,
  'api-settings': ApiSettingsPanel,
  'api-sync': ApiSyncPanel,
  'balance-log': BalanceLogPanel,
  'price-customization': PriceCustomizationPanel,
  'commission-config': CommissionConfigPanel,
  // Services & Content
  sections: SectionsPanel,
  'sub-sections': SubSectionsPanel,
  providers: ProvidersPanel,
  packages: PackagesPanel,
  'instant-recharge': InstantRechargePanel,
  visibility: VisibilityPanel,
  banners: BannersPanel,
  'bulk-codes': BulkCodesPanel,
  // Digital Wallet
  'wallet-services': WalletServicesPanel,
  'wallet-addresses': WalletAddressesPanel,
  'exchange-rates': ExchangeRatesPanel,
  banks: BanksPanel,
  'currency-cards': CurrencyCardsPanel,
  'card-colors': CardColorsPanel,
  // Users
  users: UsersPanel,
  kyc: KYCPanel,
  'gift-codes': GiftCodesPanel,
  'user-gift-codes': UserGiftCodesPanel,
  offices: OfficesPanel,
  // Support
  'support-tickets': SupportTicketsPanel,
  'support-livechat': SupportLiveChatPanel,
  'direct-chat': DirectChatPanel,
  'social-links': SocialLinksPanel,
  'user-reviews': UserReviewsPanel,
  // Content & Legal
  'legal-content': LegalContentPanel,
  'promo-codes': PromoCodesPanel,
  notifications: NotificationsPanel,
  'push-notifications': PushNotificationsPanel,
  'marketing-content': MarketingContentPanel,
  // Settings
  settings: SettingsPanel,
  branding: BrandingPanel,
  employees: EmployeesPanel,
  limits: LimitsPanel,
  'branch-management': BranchManagementPanel,
  'service-analytics': ServiceAnalyticsPanel,
  'activity-log': ActivityLogPanel,
  'custom-reports': CustomReportsPanel,
  'data-export': DataExportPanel,
  maintenance: MaintenancePanel,
  backup: BackupPanel,
  about: AboutPanel,
};

// Loading spinner for Suspense fallback
function PanelLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const {
    isAuthenticated, adminUser, activePanel,
    setAdminUser, logout, setSidebarOpen,
  } = useAdminStore();

  // Supabase Realtime sync (replaces Firebase onValue listeners)
  useSupabaseSync();
  const [initializing, setInitializing] = useState(true);
  const [newNotifications, setNewNotifications] = useState(0);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const roleRef = ref(database, `users/${user.uid}/role`);
          const roleSnapshot = await get(roleRef);
          const role = roleSnapshot.val();

          if (role === 'admin' || role === 'owner') {
            const nameRef = ref(database, `users/${user.uid}`);
            const nameSnapshot = await get(nameRef);
            const userData = nameSnapshot.val() || {};

            setAdminUser({
              uid: user.uid,
              email: user.email || '',
              displayName: userData.name || userData.firstName || user.email?.split('@')[0] || '',
              role,
              photoURL: userData.avatar || user.photoURL || undefined,
            });
          } else {
            logout();
          }
        } catch (e) {
          console.error('Error checking auth state:', e);
          logout();
        }
      } else {
        logout();
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for admin notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    const notifRef = ref(database, 'adminNotifications');
    const unsub = onValue(notifRef, (snapshot) => {
      const data = snapshot.val() || {};
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      let count = 0;
      Object.values(data).forEach((n: any) => {
        if (n.sentAt && new Date(n.sentAt) > fiveMinAgo) count++;
      });
      setNewNotifications(count);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // Initialize Capacitor Push Notifications for admin app
  useEffect(() => {
    if (!isAuthenticated || !adminUser) return;

    const initPushNotifications = async () => {
      try {
        const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
        const isNative = win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform();

        if (isNative) {
          const { PushNotifications } = await import('@capacitor/push-notifications');

          const permResult = await PushNotifications.requestPermissions();
          if (permResult.receive !== 'granted') {
            console.warn('Admin push notification permission denied');
            return;
          }

          await PushNotifications.register();

          PushNotifications.addListener('registration', async (token) => {
            console.log('Admin push registration success:', token.value);
            try {
              const { ref, set: firebaseSet } = await import('firebase/database');
              await firebaseSet(ref(database, `users/${adminUser.uid}/fcmToken`), token.value);
            } catch (e) {
              console.warn('Failed to save admin FCM token:', e);
            }
          });

          PushNotifications.addListener('registrationError', (error) => {
            console.warn('Admin push registration error:', error);
          });

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Admin push notification received:', notification);
            try {
              const audio = new Audio('/sounds/notification.wav');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch {}
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Admin push notification action:', action);
          });
        } else {
          try {
            const { getToken, onMessage } = await import('firebase/messaging');
            const { getMessaging, isSupported } = await import('firebase/messaging');

            const supported = await isSupported();
            if (!supported) return;

            const { getApp } = await import('firebase/app');
            const messaging = getMessaging(getApp());

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const vapidKey = 'BMqFpzYvhfjzEM3v1Oq-gMfPwFwmI_S04g-QC_Lz1yFEPG4bZxqXbHOyI_NzJqPWKMfCgL_2MnC1r8l0G6eFyLA';
              const currentToken = await getToken(messaging, { vapidKey });

              if (currentToken) {
                const { ref, set: firebaseSet } = await import('firebase/database');
                await firebaseSet(ref(database, `users/${adminUser.uid}/fcmToken`), currentToken);
                console.log('Admin web FCM token saved');
              }

              onMessage(messaging, (payload) => {
                console.log('Admin foreground message:', payload);
                try {
                  const audio = new Audio('/sounds/notification.wav');
                  audio.volume = 0.5;
                  audio.play().catch(() => {});
                } catch {}
                if (navigator.vibrate) navigator.vibrate(100);
              });
            }
          } catch (webError) {
            console.warn('Admin web Firebase Messaging not available:', webError);
          }
        }
      } catch (error) {
        console.warn('Admin push notifications init failed (non-fatal):', error);
      }
    };

    const timer = setTimeout(initPushNotifications, 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, adminUser]);

  // Android back button handler
  useEffect(() => {
    if (!isAuthenticated) return;

    let backPressedCount = 0;
    let listener: any = null;

    const setupBackButton = async () => {
      try {
        const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
        const isNative = win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform();
        if (!isNative) return;

        const { App } = await import('@capacitor/app');
        listener = await App.addListener('backButton', () => {
          const state = useAdminStore.getState();

          if (state.sidebarOpen) { state.setSidebarOpen(false); return; }

          if (state.activePanel !== 'dashboard') {
            state.setActivePanel('dashboard');
            return;
          }

          if (backPressedCount === 0) {
            backPressedCount = 1;
            setTimeout(() => { backPressedCount = 0; }, 2000);
          } else if (backPressedCount === 1) {
            App.exitApp();
          }
        });
      } catch (e) {
        // Not running in Capacitor native - ignore
      }
    };

    setupBackButton();

    return () => {
      if (listener && typeof listener.then === 'function') {
        listener.then((l: any) => l?.remove?.()).catch(() => {});
      } else if (listener?.remove) {
        listener.remove();
      }
    };
  }, [isAuthenticated]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center ios-bg">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#5C1A1B] to-[#3D0F10] flex items-center justify-center overflow-hidden shadow-xl shadow-[#5C1A1B]/20">
            <img src={APP_ICON_BASE64} alt="" className="w-10 h-10 object-contain" />
          </div>
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري التحقق...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated || !adminUser) {
    return <LoginScreen />;
  }

  // Owner-only panels
  const ownerOnlyPanels = ['sections', 'visibility', 'api-settings', 'activity-log', 'backup', 'maintenance', 'branding', 'employees', 'card-colors'];
  const effectivePanel = (adminUser.role !== 'owner' && ownerOnlyPanels.includes(activePanel)) ? 'dashboard' : activePanel;
  const ActivePanelComponent = panelMap[effectivePanel] || Dashboard;

  return (
    <div className="min-h-screen ios-bg">
      <Sidebar />

      <div className="lg:mr-[280px] min-h-screen">
        {/* iOS-style Header */}
        <header className="sticky top-0 z-30 glass-header">
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
              >
                <Menu className="w-5 h-5 text-foreground" />
              </button>
              <div className="hidden lg:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
                <span className="text-xs text-muted-foreground">
                  {adminUser.role === 'owner' ? 'المالك' : 'المدير'}: {adminUser.displayName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {newNotifications > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{newNotifications} جديد</span>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectivePanel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense fallback={<PanelLoader />}>
                <ActivePanelComponent />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
