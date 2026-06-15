'use client';

import { useAdminStore, AdminRole } from '@/lib/store';
import { cn } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import {
  LayoutDashboard,
  Server,
  Globe,
  Code,
  RefreshCw,
  Wallet,
  CircleDollarSign,
  Grid3X3,
  Layers,
  Eye,
  Image,
  Palette,
  Users,
  Shield,
  UserCog,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  Landmark,
  Gift,
  Headphones,
  Ticket,
  MessageCircle,
  Link2,
  FileText,
  Bell,
  Send,
  Settings,
  SlidersHorizontal,
  BarChart3,
  Activity,
  Wrench,
  Database,
  Building2,
  Info,
  LogOut,
  X,
  Moon,
  Sun,
  ChevronDown,
  ArrowLeftRight,
  ShieldCheck,
  TrendingUp,
  Percent,
  Layers3,
  Star,
  Megaphone,
  MapPin,
  FileBarChart,
  Download,
  CreditCard,
  ClipboardList,
  Tag,
  Zap,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { APP_ICON_BASE64 } from '@/lib/app-icon';
import { useMemo, useState, useEffect } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: AdminRole[];
  badge?: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, roles: ['admin', 'owner'] },
    ],
  },
  {
    id: 'financial',
    label: 'العمليات المالية',
    icon: Banknote,
    items: [
      { id: 'deposits', label: 'الإيداعات', icon: ArrowDownCircle, roles: ['admin', 'owner'], badge: 'deposit' },
      { id: 'withdrawals', label: 'السحوبات', icon: ArrowUpCircle, roles: ['admin', 'owner'], badge: 'withdraw' },
      { id: 'orders', label: 'الطلبات', icon: ShoppingCart, roles: ['admin', 'owner'], badge: 'orders' },
      { id: 'transfers', label: 'التحويلات', icon: ArrowLeftRight, roles: ['admin', 'owner'] },
      { id: 'commissions', label: 'العمولات', icon: Percent, roles: ['admin', 'owner'] },
      { id: 'investments', label: 'الاستثمارات', icon: TrendingUp, roles: ['admin', 'owner'] },
      { id: 'escrow', label: 'الضمان/الوسيط', icon: ShieldCheck, roles: ['admin', 'owner'] },
    ],
  },
  {
    id: 'api-management',
    label: 'إدارة API',
    icon: Server,
    items: [
      { id: 'api-settings', label: 'إعدادات API', icon: Code, roles: ['owner'] },
      { id: 'api-sync', label: 'المزامنة', icon: RefreshCw, roles: ['admin', 'owner'] },
      { id: 'balance-log', label: 'سجل الأرصدة', icon: ClipboardList, roles: ['admin', 'owner'] },
      { id: 'price-customization', label: 'تخصيص الأسعار', icon: Tag, roles: ['admin', 'owner'] },
      { id: 'commission-config', label: 'تخصيص العمولة', icon: Percent, roles: ['admin', 'owner'] },
    ],
  },
  {
    id: 'services-content',
    label: 'الخدمات والمحتوى',
    icon: Grid3X3,
    items: [
      { id: 'sections', label: 'الأقسام', icon: Layers, roles: ['owner'] },
      { id: 'sub-sections', label: 'الأقسام الفرعية', icon: Layers3, roles: ['admin', 'owner'] },
      { id: 'providers', label: 'المزودون', icon: Globe, roles: ['admin', 'owner'] },
      { id: 'packages', label: 'الباقات', icon: CreditCard, roles: ['admin', 'owner'] },
      { id: 'instant-recharge', label: 'الشحن الفوري', icon: Zap, roles: ['admin', 'owner'] },
      { id: 'visibility', label: 'الرؤية والإخفاء', icon: Eye, roles: ['owner'] },
      { id: 'banners', label: 'البانرات', icon: Image, roles: ['admin', 'owner'] },
      { id: 'bulk-codes', label: 'أكواد الجملة', icon: Layers3, roles: ['admin', 'owner'] },
    ],
  },
  {
    id: 'digital-wallet',
    label: 'محفظة رقمية',
    icon: Wallet,
    items: [
      { id: 'wallet-services', label: 'خدمات المحفظة', icon: Wallet, roles: ['admin', 'owner'] },
      { id: 'wallet-addresses', label: 'عناوين المحافظ', icon: CircleDollarSign, roles: ['admin', 'owner'] },
      { id: 'exchange-rates', label: 'أسعار الصرف', icon: CircleDollarSign, roles: ['admin', 'owner'] },
      { id: 'banks', label: 'البنوك', icon: Landmark, roles: ['admin', 'owner'] },
      { id: 'currency-cards', label: 'بطاقات العملات', icon: CreditCard, roles: ['admin', 'owner'] },
      { id: 'card-colors', label: 'ألوان البطاقات', icon: Palette, roles: ['owner'] },
    ],
  },
  {
    id: 'users',
    label: 'المستخدمين',
    icon: Users,
    items: [
      { id: 'users', label: 'المستخدمين', icon: Users, roles: ['admin', 'owner'] },
      { id: 'kyc', label: 'التحقق KYC', icon: Shield, roles: ['admin', 'owner'], badge: 'kyc' },
      { id: 'gift-codes', label: 'أكواد الهدايا', icon: Gift, roles: ['admin', 'owner'] },
      { id: 'user-gift-codes', label: 'قسائم المستخدمين', icon: Gift, roles: ['admin', 'owner'] },
      { id: 'offices', label: 'المكاتب والوكلاء', icon: Building2, roles: ['admin', 'owner'] },
    ],
  },
  {
    id: 'support',
    label: 'الدعم',
    icon: Headphones,
    items: [
      { id: 'support-tickets', label: 'تذاكر الدعم', icon: Ticket, roles: ['admin', 'owner'] },
      { id: 'support-livechat', label: 'الدردشة المباشرة', icon: MessageCircle, roles: ['admin', 'owner'] },
      { id: 'social-links', label: 'الروابط الاجتماعية', icon: Link2, roles: ['admin', 'owner'] },
      { id: 'user-reviews', label: 'تقييمات المستخدمين', icon: Star, roles: ['admin', 'owner'] },
    ],
  },
  {
    id: 'content-legal',
    label: 'المحتوى والقانون',
    icon: FileText,
    items: [
      { id: 'legal-content', label: 'المحتوى القانوني', icon: FileText, roles: ['admin', 'owner'] },
      { id: 'promo-codes', label: 'العروض والأكواد', icon: Tag, roles: ['admin', 'owner'] },
      { id: 'notifications', label: 'الإشعارات', icon: Bell, roles: ['admin', 'owner'] },
      { id: 'push-notifications', label: 'دفع الإشعارات', icon: Send, roles: ['admin', 'owner'] },
      { id: 'marketing-content', label: 'المحتوى التسويقي', icon: Megaphone, roles: ['admin', 'owner'] },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    items: [
      { id: 'settings', label: 'عام', icon: Settings, roles: ['admin', 'owner'] },
      { id: 'branding', label: 'العلامة التجارية', icon: Palette, roles: ['owner'] },
      { id: 'employees', label: 'الموظفين', icon: UserCog, roles: ['owner'] },
      { id: 'limits', label: 'حدود المعاملات', icon: SlidersHorizontal, roles: ['admin', 'owner'] },
      { id: 'branch-management', label: 'إدارة الفروع', icon: MapPin, roles: ['admin', 'owner'] },
      { id: 'service-analytics', label: 'التحليلات', icon: BarChart3, roles: ['admin', 'owner'] },
      { id: 'activity-log', label: 'سجل النشاط', icon: Activity, roles: ['owner'] },
      { id: 'custom-reports', label: 'تقارير مخصصة', icon: FileBarChart, roles: ['admin', 'owner'] },
      { id: 'data-export', label: 'التصدير', icon: Download, roles: ['admin', 'owner'] },
      { id: 'maintenance', label: 'الصيانة', icon: Wrench, roles: ['owner'] },
      { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, roles: ['owner'] },
      { id: 'about', label: 'حول النظام', icon: Info, roles: ['admin', 'owner'] },
    ],
  },
];

export default function Sidebar() {
  const {
    activePanel, setActivePanel, sidebarOpen, setSidebarOpen,
    adminUser, logout,
    depositRequests, withdrawRequests, kycPendingUsers, orders,
  } = useAdminStore();
  const { theme, setTheme } = useTheme();
  const [appName, setAppName] = useState('لوحة الإدارة');

  // Listen for app name from Firebase
  useEffect(() => {
    const configRef = ref(database, 'ownerSettings/projectConfig/appName');
    const unsub = onValue(configRef, (snapshot) => {
      if (snapshot.val()) setAppName(snapshot.val());
    });
    return () => unsub();
  }, []);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    financial: true,
    'api-management': false,
    'services-content': false,
    'digital-wallet': false,
    users: false,
    support: false,
    'content-legal': false,
    settings: false,
  });

  const badges = useMemo(() => {
    const pendingDeposits = depositRequests.filter(d => d.status === 'pending').length;
    const pendingWithdrawals = withdrawRequests.filter(w => w.status === 'pending').length;
    const pendingKYC = kycPendingUsers.filter(u => u.kycStatus === 'submitted').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    return {
      deposit: pendingDeposits,
      withdraw: pendingWithdrawals,
      kyc: pendingKYC,
      orders: pendingOrders,
    };
  }, [depositRequests, withdrawRequests, kycPendingUsers, orders]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    useAdminStore.getState().setTheme(newTheme as 'light' | 'dark');
  };

  // Filter sections based on role
  const filteredSections = useMemo(() => {
    if (!adminUser) return [];
    return navSections.map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(adminUser.role)),
    })).filter(section => section.items.length > 0);
  }, [adminUser]);

  // Compute section badge counts
  const sectionBadges = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSections.forEach(section => {
      let count = 0;
      section.items.forEach(item => {
        if (item.badge && badges[item.badge as keyof typeof badges]) {
          count += badges[item.badge as keyof typeof badges];
        }
      });
      counts[section.id] = count;
    });
    return counts;
  }, [filteredSections, badges]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-[280px] z-50 flex flex-col transition-transform duration-300 ease-in-out',
          'glass-sidebar',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(92, 26, 27, 0.08) 0%, rgba(61, 15, 16, 0.04) 50%, rgba(26, 10, 14, 0.06) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderLeft: '1px solid rgba(92, 26, 27, 0.12)',
        }}
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5C1A1B] to-[#3D0F10] flex items-center justify-center overflow-hidden shadow-lg shadow-[#5C1A1B]/20">
                <img
                  src={APP_ICON_BASE64}
                  alt="الإدارة"
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{appName}</h2>
                <p className="text-xs text-muted-foreground">{adminUser?.displayName}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Role badge */}
          {adminUser && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#5C1A1B]/10 border border-[#5C1A1B]/15">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-[#8B2252] dark:text-[#D4547A]">
                {adminUser.role === 'owner' ? 'المالك' : 'مدير'}
              </span>
              <span className="text-xs text-muted-foreground mr-auto">متصل</span>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4 space-y-1">
          {filteredSections.map((section) => {
            const isExpanded = expandedSections[section.id];
            const isDashboard = section.id === 'dashboard';
            const SectionIcon = section.icon;
            const sectionBadgeCount = sectionBadges[section.id] || 0;
            const hasActiveItem = section.items.some(item => item.id === activePanel);

            if (isDashboard) {
              // Dashboard is always shown as a single item
              return (
                <div key={section.id}>
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activePanel === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActivePanel(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                          isActive
                            ? 'bg-gradient-to-l from-[#5C1A1B] to-[#3D0F10] text-white shadow-lg shadow-[#5C1A1B]/25'
                            : 'text-foreground hover:bg-[#5C1A1B]/5'
                        )}
                      >
                        <Icon className={cn('w-5 h-5 shrink-0')} />
                        <span className="flex-1 text-right">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={section.id} className="rounded-xl overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200',
                    hasActiveItem
                      ? 'bg-[#5C1A1B]/8 text-[#5C1A1B] dark:text-[#D4547A]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  )}
                >
                  <SectionIcon className={cn(
                    'w-4 h-4 shrink-0',
                    hasActiveItem && 'text-[#5C1A1B] dark:text-[#D4547A]'
                  )} />
                  <span className="flex-1 text-right">{section.label}</span>
                  {sectionBadgeCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-gradient-to-l from-[#5C1A1B] to-[#3D0F10] text-white text-[10px] font-bold px-1.5 shadow-sm"
                    >
                      {sectionBadgeCount}
                    </motion.span>
                  )}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.div>
                </button>

                {/* Section Items */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pr-3 py-1">
                        {section.items.map((item, index) => {
                          const Icon = item.icon;
                          const isActive = activePanel === item.id;
                          const badgeCount = item.badge ? badges[item.badge as keyof typeof badges] || 0 : 0;
                          return (
                            <motion.button
                              key={item.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03, duration: 0.2 }}
                              onClick={() => setActivePanel(item.id)}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.98]',
                                isActive
                                  ? 'bg-[#5C1A1B]/10 text-[#5C1A1B] dark:text-[#D4547A] border border-[#5C1A1B]/15 shadow-sm'
                                  : 'text-muted-foreground hover:bg-[#5C1A1B]/5 hover:text-foreground'
                              )}
                            >
                              <Icon className={cn(
                                'w-4 h-4 shrink-0',
                                isActive && 'text-[#5C1A1B] dark:text-[#D4547A]'
                              )} />
                              <span className="flex-1 text-right">{item.label}</span>
                              {badgeCount > 0 && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1"
                                >
                                  {badgeCount}
                                </motion.span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#5C1A1B]/10">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-[#5C1A1B]/5 transition-all active:scale-[0.98]"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>

          {/* QTBM DEV Credit */}
          <div className="mt-3 pt-3 border-t border-border/30 text-center">
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              تم التطوير بواسطة: مؤسسة QTBM DEV
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
