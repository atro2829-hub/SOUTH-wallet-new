'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove, push, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatBalance, formatNumber, currencySymbols, timeAgo, generateId, formatDateAr } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, UserCheck, UserX, DollarSign, Shield, Eye, Loader2,
  Edit, Lock, Key, CreditCard, FileDown, Bell, Activity,
  ArrowDownCircle, ArrowUpCircle, ShoppingCart, TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { notifyAccountStatus, notifyKycStatus, sendNotificationToUser } from '@/lib/notifications';

export default function UsersPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Balance dialog
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceCurrency, setBalanceCurrency] = useState('YER');

  // Role dialog
  const [roleDialog, setRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState('');

  // Edit info dialog
  const [editInfoDialog, setEditInfoDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGovernorate, setEditGovernorate] = useState('');

  // Block dialog
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // KYC dialog
  const [kycDialog, setKycDialog] = useState(false);
  const [newKycStatus, setNewKycStatus] = useState('');

  // Card dialog
  const [cardDialog, setCardDialog] = useState(false);
  const [cardType, setCardType] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  // Password dialog
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // PIN reset dialog
  const [pinDialog, setPinDialog] = useState(false);

  // Send notification dialog
  const [notifDialog, setNotifDialog] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');

  // User details tabs
  const [userTab, setUserTab] = useState('info');
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [userActivityLog, setUserActivityLog] = useState<any[]>([]);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([uid, val]: [string, any]) => ({ uid, ...val }));
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loadUserDetails = async (user: any) => {
    try {
      // Load transactions
      const txSnapshot = await get(ref(database, `users/${user.uid}/transactions`));
      const txData = txSnapshot.val() || {};
      const txList = Object.entries(txData).map(([id, val]: [string, any]) => ({ id, ...val }));
      txList.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
      setUserTransactions(txList.slice(0, 50));

      // Load investments
      const invSnapshot = await get(ref(database, `users/${user.uid}/investments`));
      const invData = invSnapshot.val() || {};
      const invList = Object.entries(invData).map(([id, val]: [string, any]) => ({ id, ...val }));
      setUserInvestments(invList);

      // Load activity log
      const logSnapshot = await get(ref(database, `users/${user.uid}/activityLog`));
      const logData = logSnapshot.val() || {};
      const logList = Object.entries(logData).map(([id, val]: [string, any]) => ({ id, ...val }));
      logList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setUserActivityLog(logList.slice(0, 50));
    } catch (e) {
      console.error('Error loading user details:', e);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      (u.name && u.name.includes(search)) ||
      (u.firstName && u.firstName.includes(search)) ||
      (u.email && u.email.includes(search)) ||
      (u.phone && u.phone.includes(search)) ||
      (u.userId && u.userId.includes(search));
    const matchesFilter =
      filter === 'all' ||
      (filter === 'blocked' && u.isBlocked) ||
      (filter === 'kyc-submitted' && u.kycStatus === 'submitted') ||
      (filter === 'admin' && (u.role === 'admin' || u.role === 'owner'));
    return matchesSearch && matchesFilter;
  });

  const handleBlockUser = async (block: boolean) => {
    if (!selectedUser) return;
    try {
      await update(ref(database, `users/${selectedUser.uid}`), {
        isBlocked: block,
        blockReason: block ? blockReason : '',
        blockedAt: block ? new Date().toISOString() : '',
      });

      // Send push notification to the user about account status change
      try {
        await notifyAccountStatus(selectedUser.uid, block);
      } catch (notifError) {
        console.warn('Failed to send account status notification:', notifError);
      }

      showToast(block ? 'تم حظر المستخدم' : 'تم إلغاء حظر المستخدم', 'success');
      setBlockDialog(false);
      setBlockReason('');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleBalanceAdjust = async () => {
    if (!selectedUser || !balanceAmount) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const balanceKey = `balance${balanceCurrency}`;
      const currentBalance = selectedUser[balanceKey] || 0;
      const newBalance = balanceAction === 'add' ? currentBalance + amount : Math.max(0, currentBalance - amount);

      await update(ref(database, `users/${selectedUser.uid}`), { [balanceKey]: newBalance });

      // Send FCM push notification + in-app notification to the user
      try {
        await sendNotificationToUser(selectedUser.uid, {
          title: balanceAction === 'add' ? 'إضافة رصيد' : 'خصم رصيد',
          body: balanceAction === 'add'
            ? `تم إضافة ${amount} ${currencySymbols[balanceCurrency]} إلى رصيدك`
            : `تم خصم ${amount} ${currencySymbols[balanceCurrency]} من رصيدك`,
          type: 'transaction',
          data: { action: 'balance_adjust', balanceAction, amount, currency: balanceCurrency },
        });
      } catch {}

      // Log transaction
      const logEntry = {
        id: generateId(),
        type: 'admin',
        action: balanceAction === 'add' ? 'إضافة رصيد' : 'خصم رصيد',
        details: `${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${amount} ${currencySymbols[balanceCurrency]} ${balanceAction === 'add' ? 'إلى' : 'من'} حساب ${selectedUser.name || selectedUser.email}`,
        adminId: adminUser?.uid,
        adminName: adminUser?.displayName,
        timestamp: new Date().toISOString(),
      };
      await push(ref(database, 'ownerSettings/activityLog'), logEntry);

      showToast(
        `تم ${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${amount} ${currencySymbols[balanceCurrency]}`,
        'success'
      );
      setBalanceDialog(false);
      setBalanceAmount('');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      await update(ref(database, `users/${selectedUser.uid}`), { role: newRole });

      // Notify user about role change
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUser.uid, {
          title: 'تحديث الصلاحيات',
          body: `تم تحديث صلاحيات حسابك إلى: ${newRole}`,
          type: 'security',
          data: { action: 'role_change', role: newRole },
        });
      } catch (e) { console.warn('Role change notification failed:', e); }

      showToast('تم تغيير الصلاحية', 'success');
      setRoleDialog(false);
      setNewRole('');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleEditInfo = async () => {
    if (!selectedUser) return;
    try {
      const updates: any = {};
      if (editName) updates.name = editName;
      if (editPhone) updates.phone = editPhone;
      if (editEmail) updates.email = editEmail;
      if (editGovernorate) updates.governorate = editGovernorate;
      await update(ref(database, `users/${selectedUser.uid}`), updates);
      showToast('تم تحديث بيانات المستخدم', 'success');
      setEditInfoDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleChangeKYC = async () => {
    if (!selectedUser || !newKycStatus) return;
    try {
      await update(ref(database, `users/${selectedUser.uid}`), {
        kycStatus: newKycStatus,
        kycUpdatedAt: new Date().toISOString(),
      });

      // Send push notification to the user about KYC status change
      try {
        await notifyKycStatus(selectedUser.uid, newKycStatus);
      } catch (notifError) {
        console.warn('Failed to send KYC status notification:', notifError);
      }

      showToast('تم تغيير حالة التحقق', 'success');
      setKycDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleChangeCard = async () => {
    if (!selectedUser) return;
    try {
      const updates: any = {};
      if (cardType) updates.cardType = cardType;
      if (cardNumber) updates.cardNumber = cardNumber;
      await update(ref(database, `users/${selectedUser.uid}`), updates);
      showToast('تم تحديث بيانات البطاقة', 'success');
      setCardDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleResetPIN = async () => {
    if (!selectedUser) return;
    try {
      await update(ref(database, `users/${selectedUser.uid}`), {
        pin: null,
        pinResetAt: new Date().toISOString(),
      });

      // Notify user about PIN reset
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUser.uid, {
          title: 'تم إعادة تعيين الرقم السري',
          body: 'تم إعادة تعيين الرقم السري لحسابك. يرجى تسجيل الدخول وإعداد رقم سري جديد.',
          type: 'security',
          data: { action: 'pin_reset' },
        });
      } catch (e) { console.warn('PIN reset notification failed:', e); }

      showToast('تم إعادة تعيين رمز PIN', 'success');
      setPinDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleSendNotification = async () => {
    if (!selectedUser || !notifTitle || !notifBody) return;
    try {
      // Send notification with FCM push
      await sendNotificationToUser(selectedUser.uid, {
        title: notifTitle,
        body: notifBody,
        type: 'info',
      });
      showToast('تم إرسال الإشعار للمستخدم', 'success');
      setNotifDialog(false);
      setNotifTitle('');
      setNotifBody('');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleExportUser = () => {
    if (!selectedUser) return;
    const exportData = {
      uid: selectedUser.uid,
      name: selectedUser.name,
      email: selectedUser.email,
      phone: selectedUser.phone,
      userId: selectedUser.userId,
      balanceYER: selectedUser.balanceYER || 0,
      balanceSAR: selectedUser.balanceSAR || 0,
      balanceUSD: selectedUser.balanceUSD || 0,
      kycStatus: selectedUser.kycStatus,
      role: selectedUser.role,
      isBlocked: selectedUser.isBlocked,
      createdAt: selectedUser.createdAt,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_${selectedUser.uid}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير بيانات المستخدم', 'success');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <p className="text-muted-foreground text-sm mt-1">إجمالي {formatNumber(users.length)} مستخدم</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم، البريد، الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="blocked">محظور</SelectItem>
            <SelectItem value="kyc-submitted">بانتظار التحقق</SelectItem>
            <SelectItem value="admin">مديرين</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card className="admin-card border-0 shadow-none cursor-pointer card-press" onClick={() => {
              setSelectedUser(user);
              setUserTab('info');
              setDetailOpen(true);
              loadUserDetails(user);
            }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 font-bold text-sm">
                      {(user.name || user.firstName || '?')[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.name || `${user.firstName || ''} ${user.familyName || ''}`}</p>
                      <p className="text-xs text-muted-foreground">{user.email || user.phone || user.userId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.isBlocked && <Badge className="bg-red-500/20 text-red-500 text-xs">محظور</Badge>}
                    {user.role === 'owner' && <Badge className="bg-purple-500/20 text-purple-500 text-xs">مالك</Badge>}
                    {user.role === 'admin' && <Badge className="bg-blue-500/20 text-blue-500 text-xs">مدير</Badge>}
                    {user.kycStatus === 'verified' && <Badge className="bg-green-500/20 text-green-500 text-xs">موثق</Badge>}
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>ر.ي: {formatNumber(user.balanceYER || 0)}</span>
                  <span>ر.س: {formatNumber(user.balanceSAR || 0)}</span>
                  <span>$: {formatNumber(user.balanceUSD || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filteredUsers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا توجد نتائج</p>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المستخدم</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <Tabs value={userTab} onValueChange={setUserTab}>
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">المعلومات</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1">العمليات</TabsTrigger>
                <TabsTrigger value="investments" className="flex-1">الاستثمارات</TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">النشاط</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground">الاسم</Label><p className="font-medium">{selectedUser.name || '-'}</p></div>
                  <div><Label className="text-muted-foreground">البريد</Label><p className="font-medium" dir="ltr">{selectedUser.email || '-'}</p></div>
                  <div><Label className="text-muted-foreground">الهاتف</Label><p className="font-medium" dir="ltr">{selectedUser.phone || '-'}</p></div>
                  <div><Label className="text-muted-foreground">رقم الحساب</Label><p className="font-medium">{selectedUser.userId || '-'}</p></div>
                  <div><Label className="text-muted-foreground">المحافظة</Label><p className="font-medium">{selectedUser.governorate || '-'}</p></div>
                  <div><Label className="text-muted-foreground">الصلاحية</Label><p className="font-medium">{selectedUser.role === 'owner' ? 'مالك' : selectedUser.role === 'admin' ? 'مدير' : 'مستخدم'}</p></div>
                  <div><Label className="text-muted-foreground">حالة التحقق</Label><p className="font-medium">{selectedUser.kycStatus === 'verified' ? 'موثق' : selectedUser.kycStatus === 'submitted' ? 'مقدم' : selectedUser.kycStatus === 'rejected' ? 'مرفوض' : 'لم يقدم'}</p></div>
                  <div><Label className="text-muted-foreground">نوع البطاقة</Label><p className="font-medium">{selectedUser.cardType || '-'}</p></div>
                  <div><Label className="text-muted-foreground">رقم البطاقة</Label><p className="font-medium" dir="ltr">{selectedUser.cardNumber || '-'}</p></div>
                  <div><Label className="text-muted-foreground">الحالة</Label>
                    <Badge className={selectedUser.isBlocked ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}>
                      {selectedUser.isBlocked ? 'محظور' : 'نشط'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Card className="admin-card border-0 shadow-none"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">ر.ي</p><p className="font-bold text-lg">{formatNumber(selectedUser.balanceYER || 0)}</p></CardContent></Card>
                  <Card className="admin-card border-0 shadow-none"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">ر.س</p><p className="font-bold text-lg">{formatNumber(selectedUser.balanceSAR || 0)}</p></CardContent></Card>
                  <Card className="admin-card border-0 shadow-none"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">$</p><p className="font-bold text-lg">{formatNumber(selectedUser.balanceUSD || 0)}</p></CardContent></Card>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => { setBalanceDialog(true); setBalanceAction('add'); }} className="bg-green-600 hover:bg-green-700" size="sm">
                    <DollarSign className="w-4 h-4 ml-1" /> إضافة رصيد
                  </Button>
                  <Button onClick={() => { setBalanceDialog(true); setBalanceAction('subtract'); }} className="bg-orange-600 hover:bg-orange-700" size="sm">
                    <DollarSign className="w-4 h-4 ml-1" /> خصم رصيد
                  </Button>
                  <Button onClick={() => {
                    setEditName(selectedUser.name || '');
                    setEditPhone(selectedUser.phone || '');
                    setEditEmail(selectedUser.email || '');
                    setEditGovernorate(selectedUser.governorate || '');
                    setEditInfoDialog(true);
                  }} variant="outline" size="sm">
                    <Edit className="w-4 h-4 ml-1" /> تعديل البيانات
                  </Button>
                  <Button onClick={() => {
                    setNewKycStatus(selectedUser.kycStatus || 'none');
                    setKycDialog(true);
                  }} variant="outline" size="sm">
                    <Shield className="w-4 h-4 ml-1" /> تغيير التحقق
                  </Button>
                  <Button onClick={() => {
                    setCardType(selectedUser.cardType || '');
                    setCardNumber(selectedUser.cardNumber || '');
                    setCardDialog(true);
                  }} variant="outline" size="sm">
                    <CreditCard className="w-4 h-4 ml-1" /> بيانات البطاقة
                  </Button>
                  <Button onClick={() => setPinDialog(true)} variant="outline" size="sm">
                    <Key className="w-4 h-4 ml-1" /> إعادة PIN
                  </Button>
                  <Button onClick={() => {
                    setBlockReason(selectedUser.blockReason || '');
                    setBlockDialog(true);
                  }} variant={selectedUser.isBlocked ? 'default' : 'destructive'} size="sm">
                    {selectedUser.isBlocked ? <UserCheck className="w-4 h-4 ml-1" /> : <UserX className="w-4 h-4 ml-1" />}
                    {selectedUser.isBlocked ? 'إلغاء الحظر' : 'حظر'}
                  </Button>
                  <Button onClick={() => setNotifDialog(true)} variant="outline" size="sm">
                    <Bell className="w-4 h-4 ml-1" /> إرسال إشعار
                  </Button>
                  <Button onClick={() => setRoleDialog(true)} variant="outline" size="sm" className={adminUser?.role === 'owner' ? '' : 'opacity-50'}>
                    <Shield className="w-4 h-4 ml-1" /> تغيير الصلاحية
                  </Button>
                  <Button onClick={handleExportUser} variant="outline" size="sm">
                    <FileDown className="w-4 h-4 ml-1" /> تصدير البيانات
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-2">
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  {userTransactions.map((tx: any) => (
                    <Card key={tx.id} className="admin-card border-0 shadow-none mb-2">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tx.type === 'deposit' ? <ArrowDownCircle className="w-4 h-4 text-green-500" /> :
                             tx.type === 'withdraw' ? <ArrowUpCircle className="w-4 h-4 text-red-500" /> :
                             <ShoppingCart className="w-4 h-4 text-purple-500" />}
                            <div>
                              <p className="text-xs font-medium">{tx.description || tx.type}</p>
                              <p className="text-xs text-muted-foreground">{tx.createdAt ? formatDateAr(tx.createdAt) : ''}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold">{formatNumber(tx.amount || 0)} {currencySymbols[tx.currency || 'YER']}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userTransactions.length === 0 && <p className="text-center text-muted-foreground py-4">لا توجد عمليات</p>}
                </div>
              </TabsContent>

              <TabsContent value="investments" className="space-y-2">
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  {userInvestments.map((inv: any) => (
                    <Card key={inv.id} className="admin-card border-0 shadow-none mb-2">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="text-xs font-medium">{inv.planName || 'استثمار'}</p>
                              <p className="text-xs text-muted-foreground">{inv.startDate ? formatDateAr(inv.startDate) : ''}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">{formatNumber(inv.amount || 0)}</p>
                            <Badge className={inv.status === 'active' ? 'bg-green-500/20 text-green-500' : inv.status === 'completed' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'} style={{ fontSize: 10 }}>
                              {inv.status === 'active' ? 'نشط' : inv.status === 'completed' ? 'مكتمل' : 'ملغي'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userInvestments.length === 0 && <p className="text-center text-muted-foreground py-4">لا توجد استثمارات</p>}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-2">
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  {userActivityLog.map((log: any) => (
                    <Card key={log.id} className="admin-card border-0 shadow-none mb-2">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs font-medium">{log.action || log.type}</p>
                            <p className="text-xs text-muted-foreground">{log.details || ''}</p>
                            <p className="text-xs text-muted-foreground">{log.timestamp ? formatDateAr(log.timestamp) : ''}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userActivityLog.length === 0 && <p className="text-center text-muted-foreground py-4">لا يوجد سجل نشاط</p>}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={balanceDialog} onOpenChange={setBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{balanceAction === 'add' ? 'إضافة رصيد' : 'خصم رصيد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>العملة</Label>
              <Select value={balanceCurrency} onValueChange={setBalanceCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YER">ريال يمني</SelectItem>
                  <SelectItem value="SAR">ريال سعودي</SelectItem>
                  <SelectItem value="USD">دولار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="0" dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialog(false)}>إلغاء</Button>
            <Button onClick={handleBalanceAdjust} className={balanceAction === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}>
              {balanceAction === 'add' ? 'إضافة' : 'خصم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير صلاحية المستخدم</DialogTitle>
          </DialogHeader>
          <div>
            <Label>الصلاحية الجديدة</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">مستخدم</SelectItem>
                <SelectItem value="admin">مدير</SelectItem>
                <SelectItem value="owner">مالك</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)}>إلغاء</Button>
            <Button onClick={handleChangeRole}>تغيير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Info Dialog */}
      <Dialog open={editInfoDialog} onOpenChange={setEditInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>الهاتف</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} dir="ltr" /></div>
            <div><Label>البريد الإلكتروني</Label><Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} dir="ltr" /></div>
            <div><Label>المحافظة</Label><Input value={editGovernorate} onChange={(e) => setEditGovernorate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInfoDialog(false)}>إلغاء</Button>
            <Button onClick={handleEditInfo}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser?.isBlocked ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}</DialogTitle>
          </DialogHeader>
          {!selectedUser?.isBlocked && (
            <div>
              <Label>سبب الحظر</Label>
              <Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="أدخل سبب الحظر..." />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(false)}>إلغاء</Button>
            <Button
              variant={selectedUser?.isBlocked ? 'default' : 'destructive'}
              onClick={() => handleBlockUser(!selectedUser?.isBlocked)}
            >
              {selectedUser?.isBlocked ? 'إلغاء الحظر' : 'حظر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Dialog */}
      <Dialog open={kycDialog} onOpenChange={setKycDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير حالة التحقق</DialogTitle>
          </DialogHeader>
          <div>
            <Label>حالة التحقق الجديدة</Label>
            <Select value={newKycStatus} onValueChange={setNewKycStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">لم يقدم</SelectItem>
                <SelectItem value="submitted">مقدم</SelectItem>
                <SelectItem value="verified">موثق</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKycDialog(false)}>إلغاء</Button>
            <Button onClick={handleChangeKYC}>تغيير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Dialog */}
      <Dialog open={cardDialog} onOpenChange={setCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>بيانات البطاقة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>نوع البطاقة</Label><Input value={cardType} onChange={(e) => setCardType(e.target.value)} placeholder="مثال: Visa" /></div>
            <div><Label>رقم البطاقة</Label><Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} dir="ltr" placeholder="رقم البطاقة" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialog(false)}>إلغاء</Button>
            <Button onClick={handleChangeCard}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Reset Dialog */}
      <Dialog open={pinDialog} onOpenChange={setPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعادة تعيين رمز PIN</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من إعادة تعيين رمز PIN لهذا المستخدم؟ سيحتاج المستخدم إلى إنشاء رمز PIN جديد عند تسجيل الدخول.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialog(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleResetPIN}>إعادة تعيين</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notifDialog} onOpenChange={setNotifDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال إشعار للمستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان الإشعار</Label><Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} /></div>
            <div><Label>محتوى الإشعار</Label><Textarea value={notifBody} onChange={(e) => setNotifBody(e.target.value)} className="min-h-[100px]" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialog(false)}>إلغاء</Button>
            <Button onClick={handleSendNotification} className="bg-purple-600 hover:bg-purple-700">إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
