'use client';

import { useState } from 'react';
import { ref, update, push, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateId } from '@/lib/utils';
import { notifyWithdrawStatus } from '@/lib/notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WithdrawPanel() {
  const { adminUser, showToast, withdrawRequests, dataLoaded } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const filtered = withdrawRequests.filter((w) => {
    const ms = !search || (w.userName && w.userName.includes(search)) || (w.userId && w.userId.includes(search));
    const mf = statusFilter === 'all' || w.status === statusFilter;
    return ms && mf;
  });

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await update(ref(database, `withdrawRequests/${selected.id}`), {
        status: 'approved',
        notes: notes || '',
        reviewedAt: new Date().toISOString(),
      });

      // Deduct balance using Firebase transaction-safe approach
      if (selected.userId && selected.amount) {
        const balanceKey = `balance${selected.currency || 'YER'}`;
        const userRef = ref(database, `users/${selected.userId}`);
        const userSnap = await get(userRef);
        const userData = userSnap.val();
        if (userData) {
          const current = userData[balanceKey] || 0;
          await update(ref(database, `users/${selected.userId}`), {
            [balanceKey]: Math.max(0, current - selected.amount),
          });
        }
      }

      // Send push notification to the user
      try {
        await notifyWithdrawStatus(
          selected.userId,
          selected.amount,
          selected.currency || 'YER',
          'approved'
        );
      } catch (notifError) {
        console.warn('Failed to send withdraw notification:', notifError);
      }

      await push(ref(database, 'ownerSettings/activityLog'), {
        id: generateId(), type: 'admin', action: 'قبول سحب',
        details: `قبول سحب ${selected.amount} ${currencySymbols[selected.currency || 'YER']} من ${selected.userName}`,
        adminId: adminUser?.uid, adminName: adminUser?.displayName, timestamp: new Date().toISOString(),
      });

      showToast('تم قبول السحب وخصم الرصيد', 'success');
      setDetailOpen(false);
      setNotes('');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      await update(ref(database, `withdrawRequests/${selected.id}`), {
        status: 'rejected',
        notes: notes || '',
        reviewedAt: new Date().toISOString(),
      });

      // Send push notification to the user
      try {
        await notifyWithdrawStatus(
          selected.userId,
          selected.amount,
          selected.currency || 'YER',
          'rejected'
        );
      } catch (notifError) {
        console.warn('Failed to send withdraw rejection notification:', notifError);
      }

      showToast('تم رفض طلب السحب', 'success');
      setDetailOpen(false);
      setNotes('');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const statusLabel: Record<string, string> = { pending: 'معلق', approved: 'مقبول', rejected: 'مرفوض' };
  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    approved: 'bg-green-500/20 text-green-600 dark:text-green-400',
    rejected: 'bg-red-500/20 text-red-600 dark:text-red-400',
  };

  if (!dataLoaded) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">طلبات السحب</h1>
        <p className="text-muted-foreground text-sm mt-1">{formatNumber(withdrawRequests.filter(w => w.status === 'pending').length)} طلب معلق</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="approved">مقبول</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {filtered.map((wd, i) => (
          <motion.div key={wd.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <Card className="admin-card border-0 shadow-none cursor-pointer card-press" onClick={() => { setSelected(wd); setDetailOpen(true); setNotes(''); }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{wd.userName || 'مستخدم'}</p>
                    <p className="text-xs text-muted-foreground">{wd.bankDetails || 'لا توجد تفاصيل'}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{formatNumber(wd.amount || 0)} {currencySymbols[wd.currency || 'YER']}</p>
                    <Badge className={statusColor[wd.status] || ''}>{statusLabel[wd.status] || wd.status}</Badge>
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
          <DialogHeader><DialogTitle>تفاصيل طلب السحب</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground">المستخدم</Label><p className="font-medium">{selected.userName || '-'}</p></div>
                <div><Label className="text-muted-foreground">المبلغ</Label><p className="font-bold">{formatNumber(selected.amount)} {currencySymbols[selected.currency || 'YER']}</p></div>
                <div><Label className="text-muted-foreground">الطريقة</Label><p className="font-medium">{selected.method === 'bank_transfer' ? 'تحويل بنكي' : 'نقدي'}</p></div>
                <div><Label className="text-muted-foreground">الحالة</Label><Badge className={statusColor[selected.status]}>{statusLabel[selected.status]}</Badge></div>
              </div>
              {selected.bankDetails && (
                <div><Label className="text-muted-foreground">تفاصيل البنك</Label><p className="text-sm mt-1 p-2 bg-muted rounded-lg">{selected.bankDetails}</p></div>
              )}
              {selected.status === 'pending' && (
                <>
                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..." />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 ml-1" /> قبول</Button>
                    <Button onClick={handleReject} variant="destructive" className="flex-1"><XCircle className="w-4 h-4 ml-1" /> رفض</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
