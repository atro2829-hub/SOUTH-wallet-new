'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, push, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, timeAgo, generateId } from '@/lib/utils';
import { notifyOrderStatus } from '@/lib/notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrdersPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const ordersRef = ref(database, 'orders');
    const unsub = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = orders.filter((o) => {
    const matchesSearch = !search ||
      (o.userName && o.userName.includes(search)) ||
      (o.providerName && o.providerName.includes(search)) ||
      (o.id && o.id.includes(search)) ||
      (o.customerInput && o.customerInput.includes(search));
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleComplete = async (order: any) => {
    try {
      await update(ref(database, `orders/${order.id}`), {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      // Send push notification to the user
      try {
        await notifyOrderStatus(order.userId, order.packageName || order.providerName, 'completed');
      } catch (notifError) {
        console.warn('Failed to send order notification:', notifError);
      }

      const logEntry = {
        id: generateId(),
        type: 'admin',
        action: 'إتمام طلب',
        details: `إتمام طلب ${order.packageName || order.providerName} للمستخدم ${order.userName}`,
        adminId: adminUser?.uid,
        adminName: adminUser?.displayName,
        timestamp: new Date().toISOString(),
      };
      await push(ref(database, 'ownerSettings/activityLog'), logEntry);
      showToast('تم إتمام الطلب', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleCancel = async (order: any) => {
    try {
      await update(ref(database, `orders/${order.id}`), {
        status: 'cancelled',
        completedAt: new Date().toISOString(),
      });

      // Refund
      if (order.userId && order.amount) {
        const balanceKey = `balance${order.currency || 'YER'}`;
        const userRef = ref(database, `users/${order.userId}`);
        const userSnap = await get(userRef);
        const userData = userSnap.val();
        if (userData) {
          const currentBalance = userData[balanceKey] || 0;
          await update(ref(database, `users/${order.userId}`), {
            [balanceKey]: currentBalance + order.amount,
          });
        }
      }

      // Send push notification to the user
      try {
        await notifyOrderStatus(order.userId, order.packageName || order.providerName, 'cancelled');
      } catch (notifError) {
        console.warn('Failed to send order cancellation notification:', notifError);
      }

      const logEntry = {
        id: generateId(),
        type: 'admin',
        action: 'إلغاء طلب واسترداد',
        details: `إلغاء طلب ${order.packageName || order.providerName} واسترداد ${order.amount} ${currencySymbols[order.currency || 'YER']}`,
        adminId: adminUser?.uid,
        adminName: adminUser?.displayName,
        timestamp: new Date().toISOString(),
      };
      await push(ref(database, 'ownerSettings/activityLog'), logEntry);
      showToast('تم إلغاء الطلب واسترداد المبلغ', 'success');
      setDetailOpen(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const statusLabel: Record<string, string> = {
    pending: 'معلق',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    refunded: 'مسترد',
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    completed: 'bg-green-500/20 text-green-600 dark:text-green-400',
    cancelled: 'bg-red-500/20 text-red-600 dark:text-red-400',
    refunded: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
        <p className="text-muted-foreground text-sm mt-1">إجمالي {formatNumber(orders.length)} طلب</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {filtered.map((order, i) => (
          <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <Card className="admin-card border-0 shadow-none cursor-pointer card-press" onClick={() => { setSelectedOrder(order); setDetailOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{order.packageName || order.providerName || 'طلب'}</p>
                    <p className="text-xs text-muted-foreground">{order.userName} - {order.customerInput}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{formatNumber(order.amount || 0)} {currencySymbols[order.currency || 'YER']}</p>
                    <Badge className={statusColor[order.status] || ''}>{statusLabel[order.status] || order.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل الطلب</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground">المزود</Label><p className="font-medium">{selectedOrder.providerName || '-'}</p></div>
                <div><Label className="text-muted-foreground">الباقة</Label><p className="font-medium">{selectedOrder.packageName || '-'}</p></div>
                <div><Label className="text-muted-foreground">المستخدم</Label><p className="font-medium">{selectedOrder.userName || '-'}</p></div>
                <div><Label className="text-muted-foreground">المدخل</Label><p className="font-medium" dir="ltr">{selectedOrder.customerInput || '-'}</p></div>
                <div><Label className="text-muted-foreground">المبلغ</Label><p className="font-medium">{formatNumber(selectedOrder.amount)} {currencySymbols[selectedOrder.currency || 'YER']}</p></div>
                <div><Label className="text-muted-foreground">الحالة</Label><Badge className={statusColor[selectedOrder.status]}>{statusLabel[selectedOrder.status]}</Badge></div>
                <div><Label className="text-muted-foreground">تاريخ الإنشاء</Label><p className="font-medium text-xs">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('ar-SA') : '-'}</p></div>
                <div><Label className="text-muted-foreground">نوع التنفيذ</Label><p className="font-medium">{selectedOrder.executionType === 'auto' ? 'تلقائي' : 'يدوي'}</p></div>
              </div>
              {selectedOrder.status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={() => handleComplete(selectedOrder)} className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 ml-1" /> إتمام
                  </Button>
                  <Button onClick={() => handleCancel(selectedOrder)} variant="destructive" className="flex-1">
                    <XCircle className="w-4 h-4 ml-1" /> إلغاء واسترداد
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
