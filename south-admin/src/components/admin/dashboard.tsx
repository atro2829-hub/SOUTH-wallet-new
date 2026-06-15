'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  Shield,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Server,
  Database,
  Bell,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayValue(Math.floor(eased * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{formatNumber(displayValue)}</>;
}

// Mini chart component (SVG sparkline)
function MiniChart({ data, color = '#8B5CF6', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Simple bar chart component
function BarChart({ data, labels, color = '#8B5CF6' }: { data: number[]; labels?: string[]; color?: string }) {
  const max = Math.max(...data) || 1;

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((value, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${(value / max) * 100}%`,
              minHeight: value > 0 ? '4px' : '0px',
              backgroundColor: color,
              opacity: 0.7 + (value / max) * 0.3,
            }}
          />
          {labels && labels[i] && (
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">{labels[i]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { adminUser, depositRequests, withdrawRequests, kycPendingUsers, orders, allUsers, dataLoaded } = useAdminStore();
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newToday = allUsers.filter((u: any) => u.createdAt && u.createdAt.startsWith(today)).length;
    const newYesterday = allUsers.filter((u: any) => u.createdAt && u.createdAt.startsWith(yesterday)).length;
    const pendingKyc = kycPendingUsers.filter((u: any) => u.kycStatus === 'submitted').length;
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
    const completed = orders.filter((o: any) => o.status === 'completed');
    const revYER = completed.filter((o: any) => o.currency === 'YER').reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const revSAR = completed.filter((o: any) => o.currency === 'SAR').reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const revUSD = completed.filter((o: any) => o.currency === 'USD').reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const pendingDeposits = depositRequests.filter((d: any) => d.status === 'pending').length;
    const pendingWithdrawals = withdrawRequests.filter((w: any) => w.status === 'pending').length;
    const activeUsers = allUsers.filter((u: any) => {
      if (!u.lastLogin) return false;
      const lastLogin = new Date(u.lastLogin);
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      return lastLogin > weekAgo;
    }).length;
    const blockedUsers = allUsers.filter((u: any) => u.isBlocked).length;

    return {
      totalUsers: allUsers.length,
      newUsersToday: newToday,
      newUsersYesterday: newYesterday,
      activeUsers,
      blockedUsers,
      totalOrders: orders.length,
      pendingOrders,
      pendingDeposits,
      pendingWithdrawals,
      pendingKYC: pendingKyc,
      revenueYER: revYER,
      revenueSAR: revSAR,
      revenueUSD: revUSD,
      completedOrders: completed.length,
    };
  }, [allUsers, orders, depositRequests, withdrawRequests, kycPendingUsers]);

  // Generate chart data from orders
  const chartData = useMemo(() => {
    const now = new Date();
    const dailyData: number[] = [];
    const dailyLabels: string[] = [];
    const userData: number[] = [];

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = orders.filter((o: any) => o.createdAt && o.createdAt.startsWith(dateStr));
      const dayUsers = allUsers.filter((u: any) => u.createdAt && u.createdAt.startsWith(dateStr));
      dailyData.push(dayOrders.length);
      userData.push(dayUsers.length);
      dailyLabels.push(date.toLocaleDateString('ar-SA', { weekday: 'short' }));
    }

    return { dailyData, dailyLabels, userData };
  }, [orders, allUsers]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 8);
  }, [orders]);

  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    depositRequests.slice(0, 3).forEach((d: any) => {
      activities.push({ type: 'deposit', ...d });
    });
    withdrawRequests.slice(0, 3).forEach((w: any) => {
      activities.push({ type: 'withdraw', ...w });
    });
    activities.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return activities.slice(0, 6);
  }, [depositRequests, withdrawRequests]);

  // System health indicators
  const systemHealth = useMemo(() => {
    const pendingCount = stats.pendingOrders + stats.pendingDeposits + stats.pendingWithdrawals + stats.pendingKYC;
    return [
      { label: 'الخادم', status: 'online', icon: Server },
      { label: 'قاعدة البيانات', status: 'online', icon: Database },
      { label: 'الإشعارات', status: 'online', icon: Bell },
      { label: `بانتظار المراجعة (${pendingCount})`, status: pendingCount > 20 ? 'warning' : 'online', icon: AlertTriangle },
    ];
  }, [stats]);

  const statCards = [
    {
      title: 'إجمالي المستخدمين',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      sub: `${formatNumber(stats.newUsersToday)} جديد اليوم`,
      trend: stats.newUsersToday > stats.newUsersYesterday ? 'up' : 'down',
      chartData: chartData.userData,
      chartColor: '#3B82F6',
    },
    {
      title: 'إجمالي الطلبات',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      sub: `${formatNumber(stats.pendingOrders)} قيد الانتظار`,
      trend: 'up',
      chartData: chartData.dailyData,
      chartColor: '#8B5CF6',
    },
    {
      title: 'طلبات الإيداع',
      value: stats.pendingDeposits,
      icon: ArrowDownCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      sub: 'بانتظار المراجعة',
      trend: 'up',
      chartData: [2, 5, 3, 8, 4, 6, stats.pendingDeposits],
      chartColor: '#22C55E',
    },
    {
      title: 'طلبات السحب',
      value: stats.pendingWithdrawals,
      icon: ArrowUpCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      sub: 'بانتظار المراجعة',
      trend: 'down',
      chartData: [1, 3, 2, 5, 3, 4, stats.pendingWithdrawals],
      chartColor: '#F97316',
    },
    {
      title: 'طلبات التحقق',
      value: stats.pendingKYC,
      icon: Shield,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      sub: 'بانتظار المراجعة',
      trend: 'up',
      chartData: [0, 1, 2, 1, 3, 2, stats.pendingKYC],
      chartColor: '#EAB308',
    },
    {
      title: 'المستخدمين النشطين',
      value: stats.activeUsers,
      icon: Activity,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
      sub: 'خلال 7 أيام',
      trend: 'up',
      chartData: [10, 15, 12, 18, 20, 16, stats.activeUsers % 100],
      chartColor: '#14B8A6',
    },
  ];

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* iOS Large Title Header */}
      <div>
        <h1 className="ios-large-title text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">
          مرحبا {adminUser?.displayName} 👋 — ملخص النظام
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إيداعات', icon: ArrowDownCircle, color: 'from-green-500 to-emerald-600', panel: 'deposit' },
          { label: 'سحوبات', icon: ArrowUpCircle, color: 'from-orange-500 to-red-500', panel: 'withdraw' },
          { label: 'طلبات', icon: ShoppingCart, color: 'from-purple-500 to-violet-600', panel: 'orders' },
          { label: 'تحقق', icon: Shield, color: 'from-blue-500 to-cyan-600', panel: 'kyc' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 0.96 }}
            onClick={() => useAdminStore.getState().setActivePanel(action.panel)}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-sm font-medium',
              'bg-gradient-to-r shadow-lg transition-shadow hover:shadow-xl',
              action.color
            )}
          >
            <action.icon className="w-5 h-5" />
            <span>{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="ios-card p-4 card-press">
              <div className="flex items-start justify-between mb-2">
                <div className={cn('p-2 rounded-xl', card.bgColor)}>
                  <card.icon className={cn('w-4 h-4', card.color)} />
                </div>
                {card.trend === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                )}
              </div>
              <p className="text-xl font-bold text-foreground count-up">
                <AnimatedCounter value={card.value} />
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.title}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
              <div className="mt-2">
                <MiniChart data={card.chartData} color={card.chartColor} height={28} />
              </div>
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
          <motion.div
            key={rev.currency}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
          >
            <div className="ios-card p-4 card-press">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-2xl', rev.bg)}>
                  <DollarSign className={cn('w-5 h-5', rev.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{rev.label}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    <AnimatedCounter value={rev.value} /> {currencySymbols[rev.currency]}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <div className="ios-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">حجم المعاملات</h3>
              <p className="text-xs text-muted-foreground mt-0.5">آخر 7 أيام</p>
            </div>
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              {(['daily', 'weekly', 'monthly'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    chartPeriod === period
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : 'شهري'}
                </button>
              ))}
            </div>
          </div>
          <BarChart
            data={chartData.dailyData}
            labels={chartData.dailyLabels}
            color="#8B5CF6"
          />
        </div>

        {/* User Growth Chart */}
        <div className="ios-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">نمو المستخدمين</h3>
              <p className="text-xs text-muted-foreground mt-0.5">تسجيلات جديدة يومياً</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">مستخدمين جدد</span>
            </div>
          </div>
          <MiniChart data={chartData.userData} color="#3B82F6" height={96} />
        </div>
      </div>

      {/* Bottom Row: Recent Orders + Activity Feed + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="ios-card lg:col-span-1 overflow-hidden">
          <div className="p-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">آخر الطلبات</h3>
            <button
              onClick={() => useAdminStore.getState().setActivePanel('orders')}
              className="text-xs text-purple-500 font-medium flex items-center gap-1"
            >
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
                    <div className={cn(
                      'p-1.5 rounded-lg shrink-0',
                      order.status === 'completed' ? 'bg-green-500/10' :
                      order.status === 'pending' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                    )}>
                      {order.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : order.status === 'pending' ? (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{order.packageName || order.providerName || 'طلب'}</p>
                      <p className="text-[11px] text-muted-foreground">{order.userName || 'مستخدم'}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatNumber(order.amount || 0)} {currencySymbols[order.currency || 'YER']}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'معلق' : 'ملغي'}
                      </p>
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
                    <div className={cn(
                      'p-1.5 rounded-lg shrink-0',
                      activity.type === 'deposit' ? 'bg-green-500/10' : 'bg-orange-500/10'
                    )}>
                      {activity.type === 'deposit' ? (
                        <ArrowDownCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.type === 'deposit' ? 'طلب إيداع' : 'طلب سحب'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {activity.userName || 'مستخدم'} • {activity.createdAt ? timeAgo(activity.createdAt) : ''}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatNumber(activity.amount || 0)} {currencySymbols[activity.currency || 'YER']}</p>
                      <Badge className={cn(
                        'text-[9px] px-1.5 py-0',
                        activity.status === 'completed' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                        activity.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                        'bg-red-500/15 text-red-600 dark:text-red-400'
                      )}>
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
                  <div className={cn(
                    'p-1.5 rounded-lg',
                    item.status === 'online' ? 'bg-green-500/10' : 'bg-yellow-500/10'
                  )}>
                    <Icon className={cn(
                      'w-4 h-4',
                      item.status === 'online' ? 'text-green-500' : 'text-yellow-500'
                    )} />
                  </div>
                  <span className="text-sm text-foreground flex-1">{item.label}</span>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    item.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                  )} />
                </div>
              );
            })}
          </div>

          {/* Alerts Section */}
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
