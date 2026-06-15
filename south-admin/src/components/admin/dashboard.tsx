'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, timeAgo, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Users, ShoppingCart, ArrowDownCircle, ArrowUpCircle, Shield,
  DollarSign, TrendingUp, TrendingDown, Activity, ArrowRight,
  AlertTriangle, CheckCircle2, XCircle, Server, Database, Bell,
  Clock, BarChart3, Wallet, ArrowLeftRight, ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

// Animated counter
function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(eased * value));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{formatNumber(display)}</>;
}

const CHART_COLORS = ['#5C1A1B', '#C41E3A', '#D44A5C', '#8B3A3E', '#E86E7E', '#3D0F10'];

export default function Dashboard() {
  const { adminUser, depositRequests, withdrawRequests, kycPendingUsers, orders, allUsers, dataLoaded } = useAdminStore();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newToday = allUsers.filter((u: any) => u.createdAt?.startsWith(today)).length;
    const newYesterday = allUsers.filter((u: any) => u.createdAt?.startsWith(yesterday)).length;
    const pendingKyc = kycPendingUsers.filter((u: any) => u.kycStatus === 'submitted').length;
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
    const completed = orders.filter((o: any) => o.status === 'completed');
    const revYER = completed.filter((o: any) => o.currency === 'YER').reduce((s: number, o: any) => s + (o.amount || 0), 0);
    const revSAR = completed.filter((o: any) => o.currency === 'SAR').reduce((s: number, o: any) => s + (o.amount || 0), 0);
    const revUSD = completed.filter((o: any) => o.currency === 'USD').reduce((s: number, o: any) => s + (o.amount || 0), 0);
    const pendingDeposits = depositRequests.filter((d: any) => d.status === 'pending').length;
    const pendingWithdrawals = withdrawRequests.filter((w: any) => w.status === 'pending').length;
    const activeUsers = allUsers.filter((u: any) => {
      if (!u.lastLogin) return false;
      return new Date(u.lastLogin) > new Date(Date.now() - 7 * 86400000);
    }).length;
    const blockedUsers = allUsers.filter((u: any) => u.isBlocked).length;
    const totalDeposits = depositRequests.filter((d: any) => d.status === 'approved').reduce((s: number, d: any) => s + (d.amount || 0), 0);
    const totalWithdrawals = withdrawRequests.filter((w: any) => w.status === 'approved').reduce((s: number, w: any) => s + (w.amount || 0), 0);

    return {
      totalUsers: allUsers.length, newUsersToday: newToday, newUsersYesterday: newYesterday,
      activeUsers, blockedUsers, totalOrders: orders.length, pendingOrders,
      pendingDeposits, pendingWithdrawals, pendingKYC: pendingKyc,
      revenueYER: revYER, revenueSAR: revSAR, revenueUSD: revUSD,
      completedOrders: completed.length, totalDeposits, totalWithdrawals,
    };
  }, [allUsers, orders, depositRequests, withdrawRequests, kycPendingUsers]);

  // Revenue chart data (last 7 days)
  const revenueChartData = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = orders.filter((o: any) => o.createdAt?.startsWith(dateStr) && o.status === 'completed');
      const dayDeposits = depositRequests.filter((d: any) => d.createdAt?.startsWith(dateStr) && d.status === 'approved');
      data.push({
        name: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        الطلبات: dayOrders.length,
        الإيداعات: dayDeposits.length,
        إيرادات: dayOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0),
      });
    }
    return data;
  }, [orders, depositRequests]);

  // User growth chart
  const userGrowthData = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayUsers = allUsers.filter((u: any) => u.createdAt?.startsWith(dateStr)).length;
      data.push({
        name: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        المستخدمين: dayUsers,
      });
    }
    return data;
  }, [allUsers]);

  // Order status distribution
  const orderStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
      const s = o.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusLabels: Record<string, string> = {
      pending: 'معلق', completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي', processing: 'قيد التنفيذ',
    };
    return Object.entries(statusCounts).map(([key, value]) => ({
      name: statusLabels[key] || key, value, color: CHART_COLORS[Object.keys(statusCounts).indexOf(key) % CHART_COLORS.length],
    }));
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    depositRequests.slice(0, 4).forEach((d: any) => activities.push({ type: 'deposit', ...d }));
    withdrawRequests.slice(0, 4).forEach((w: any) => activities.push({ type: 'withdraw', ...w }));
    activities.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return activities.slice(0, 8);
  }, [depositRequests, withdrawRequests]);

  const pendingCount = stats.pendingOrders + stats.pendingDeposits + stats.pendingWithdrawals + stats.pendingKYC;
  const systemHealth = [
    { label: 'الخادم', status: 'online', icon: Server },
    { label: 'قاعدة البيانات', status: 'online', icon: Database },
    { label: 'الإشعارات', status: 'online', icon: Bell },
    { label: `بانتظار المراجعة (${pendingCount})`, status: pendingCount > 20 ? 'warning' : 'online', icon: AlertTriangle },
  ];

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="ios-large-title text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">
          مرحبا {adminUser?.displayName} — ملخص النظام
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إيداعات', count: stats.pendingDeposits, icon: ArrowDownCircle, color: 'from-green-600 to-emerald-700', panel: 'deposits' },
          { label: 'سحوبات', count: stats.pendingWithdrawals, icon: ArrowUpCircle, color: 'from-orange-500 to-red-600', panel: 'withdrawals' },
          { label: 'طلبات', count: stats.pendingOrders, icon: ShoppingCart, color: 'from-[#5C1A1B] to-[#3D0F10]', panel: 'orders' },
          { label: 'تحقق', count: stats.pendingKYC, icon: Shield, color: 'from-blue-500 to-cyan-600', panel: 'kyc' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 0.96 }}
            onClick={() => useAdminStore.getState().setActivePanel(action.panel)}
            className={cn(
              'relative flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-white text-sm font-medium',
              'bg-gradient-to-r shadow-lg transition-shadow hover:shadow-xl overflow-hidden',
              action.color
            )}
          >
            <action.icon className="w-5 h-5" />
            <span>{action.label}</span>
            {action.count > 0 && (
              <span className="absolute top-2 left-2 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-white/20 text-white text-[10px] font-bold px-1.5 backdrop-blur-sm">
                {action.count}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { title: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', sub: `${formatNumber(stats.newUsersToday)} جديد اليوم`, trend: stats.newUsersToday > stats.newUsersYesterday ? 'up' : 'down' },
          { title: 'إجمالي الطلبات', value: stats.totalOrders, icon: ShoppingCart, color: 'text-[#5C1A1B] dark:text-[#C41E3A]', bg: 'bg-[#5C1A1B]/10', sub: `${formatNumber(stats.pendingOrders)} معلق`, trend: 'up' },
          { title: 'إيداعات معلقة', value: stats.pendingDeposits, icon: ArrowDownCircle, color: 'text-green-500', bg: 'bg-green-500/10', sub: 'بانتظار المراجعة', trend: 'up' },
          { title: 'سحوبات معلقة', value: stats.pendingWithdrawals, icon: ArrowUpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', sub: 'بانتظار المراجعة', trend: 'down' },
          { title: 'تحقق معلق', value: stats.pendingKYC, icon: Shield, color: 'text-yellow-500', bg: 'bg-yellow-500/10', sub: 'بانتظار المراجعة', trend: 'up' },
          { title: 'مستخدمين نشطين', value: stats.activeUsers, icon: Activity, color: 'text-teal-500', bg: 'bg-teal-500/10', sub: 'خلال 7 أيام', trend: 'up' },
        ].map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="ios-card p-4 card-press">
              <div className="flex items-start justify-between mb-2">
                <div className={cn('p-2 rounded-xl', card.bg)}>
                  <card.icon className={cn('w-4 h-4', card.color)} />
                </div>
                {card.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <p className="text-xl font-bold text-foreground"><AnimatedCounter value={card.value} /></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.title}</p>
              <p className="text-[10px] text-muted-foreground/70">{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'إيرادات الريال اليمني', value: stats.revenueYER, currency: 'YER', color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'إيرادات الريال السعودي', value: stats.revenueSAR, currency: 'SAR', color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'إيرادات الدولار', value: stats.revenueUSD, currency: 'USD', color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((rev, i) => (
          <motion.div key={rev.currency} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <div className="ios-card p-4 card-press">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-2xl', rev.bg)}><DollarSign className={cn('w-5 h-5', rev.color)} /></div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{rev.label}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5"><AnimatedCounter value={rev.value} /> {currencySymbols[rev.currency]}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Area Chart */}
        <div className="ios-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">حجم المعاملات</h3>
              <p className="text-xs text-muted-foreground mt-0.5">آخر 7 أيام</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#5C1A1B]" />الطلبات</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#C41E3A]" />الإيداعات</span>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5C1A1B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5C1A1B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C41E3A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C41E3A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(92,26,27,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                <Tooltip contentStyle={{ background: '#2A1215', border: '1px solid rgba(196,30,58,0.2)', borderRadius: '12px', color: '#F5E6E8', fontSize: 12 }} />
                <Area type="monotone" dataKey="الطلبات" stroke="#5C1A1B" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
                <Area type="monotone" dataKey="الإيداعات" stroke="#C41E3A" fillOpacity={1} fill="url(#colorDeposits)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth */}
        <div className="ios-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">نمو المستخدمين</h3>
              <p className="text-xs text-muted-foreground mt-0.5">تسجيلات جديدة يومياً</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs"><div className="w-2 h-2 rounded-full bg-blue-500" />مستخدمين جدد</span>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(92,26,27,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                <Tooltip contentStyle={{ background: '#2A1215', border: '1px solid rgba(196,30,58,0.2)', borderRadius: '12px', color: '#F5E6E8', fontSize: 12 }} />
                <Bar dataKey="المستخدمين" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="ios-card lg:col-span-1 overflow-hidden">
          <div className="p-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">آخر الطلبات</h3>
            <button onClick={() => useAdminStore.getState().setActivePanel('orders')} className="text-xs text-[#5C1A1B] dark:text-[#C41E3A] font-medium flex items-center gap-1">
              الكل <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات</p>
            ) : (
              <div>
                {recentOrders.map((order: any, i: number) => (
                  <div key={order.id || i} className="ios-list-item gap-3">
                    <div className={cn('p-1.5 rounded-lg shrink-0', order.status === 'completed' ? 'bg-green-500/10' : order.status === 'pending' ? 'bg-yellow-500/10' : 'bg-red-500/10')}>
                      {order.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : order.status === 'pending' ? <Clock className="w-4 h-4 text-yellow-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{order.packageName || order.providerName || 'طلب'}</p>
                      <p className="text-[11px] text-muted-foreground">{order.userName || 'مستخدم'}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatNumber(order.amount || 0)} {currencySymbols[order.currency || 'YER']}</p>
                      <p className="text-[10px] text-muted-foreground">{order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'معلق' : 'ملغي'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="ios-card lg:col-span-1 overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground">آخر الأنشطة</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">إيداعات وسحوبات حديثة</p>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد أنشطة حديثة</p>
            ) : (
              <div>
                {recentActivities.map((activity: any, i: number) => (
                  <div key={activity.id || i} className="ios-list-item gap-3">
                    <div className={cn('p-1.5 rounded-lg shrink-0', activity.type === 'deposit' ? 'bg-green-500/10' : 'bg-orange-500/10')}>
                      {activity.type === 'deposit' ? <ArrowDownCircle className="w-4 h-4 text-green-500" /> : <ArrowUpCircle className="w-4 h-4 text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.type === 'deposit' ? 'طلب إيداع' : 'طلب سحب'}</p>
                      <p className="text-[11px] text-muted-foreground">{activity.userName || 'مستخدم'} • {activity.createdAt ? timeAgo(activity.createdAt) : ''}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatNumber(activity.amount || 0)} {currencySymbols[activity.currency || 'YER']}</p>
                      <Badge className={cn('text-[9px] px-1.5 py-0', activity.status === 'completed' ? 'bg-green-500/15 text-green-600 dark:text-green-400' : activity.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/15 text-red-600 dark:text-red-400')}>
                        {activity.status === 'completed' ? 'مكتمل' : activity.status === 'pending' ? 'معلق' : 'مرفوض'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Health + Alerts */}
        <div className="ios-card lg:col-span-1 overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground">صحة النظام</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">حالة الخدمات</p>
          </div>
          <div className="p-2">
            {systemHealth.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className={cn('p-1.5 rounded-lg', item.status === 'online' ? 'bg-green-500/10' : 'bg-yellow-500/10')}>
                    <Icon className={cn('w-4 h-4', item.status === 'online' ? 'text-green-500' : 'text-yellow-500')} />
                  </div>
                  <span className="text-sm text-foreground flex-1">{item.label}</span>
                  <div className={cn('w-2 h-2 rounded-full', item.status === 'online' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse')} />
                </div>
              );
            })}
          </div>
          <div className="px-4 pt-2 pb-3 border-t border-border/30 mt-2">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">تنبيهات</h4>
            <div className="space-y-2">
              {stats.pendingDeposits > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  <span className="text-[11px] text-yellow-600 dark:text-yellow-400">{stats.pendingDeposits} طلب إيداع بانتظار المراجعة</span>
                </div>
              )}
              {stats.pendingWithdrawals > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[11px] text-orange-600 dark:text-orange-400">{stats.pendingWithdrawals} طلب سحب بانتظار المراجعة</span>
                </div>
              )}
              {stats.pendingKYC > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-[11px] text-blue-600 dark:text-blue-400">{stats.pendingKYC} طلب تحقق بانتظار المراجعة</span>
                </div>
              )}
              {stats.pendingDeposits === 0 && stats.pendingWithdrawals === 0 && stats.pendingKYC === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-[11px] text-green-600 dark:text-green-400">لا توجد طلبات معلقة</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
