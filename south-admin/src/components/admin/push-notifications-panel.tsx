'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, formatDateAr, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Bell, Loader2, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendFCMDirect } from '@/lib/fcm-sender';

interface NotificationHistory {
  id?: string;
  title: string;
  body: string;
  type: 'info' | 'transaction' | 'security' | 'promo';
  targetType: 'all' | 'specific' | 'segment';
  targetSegment?: string;
  sentAt: string;
  sentBy: string;
  sentByName: string;
  recipientCount?: number;
  deliveryCount?: number;
  status?: string;
  icon?: string;
  data?: string;
  scheduledAt?: string;
}

export default function PushNotificationsPanel() {
  const { adminUser, showToast, allUsers } = useAdminStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [icon, setIcon] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'transaction' | 'security' | 'promo'>('info');
  const [targetType, setTargetType] = useState<'all' | 'specific' | 'segment'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [targetSegment, setTargetSegment] = useState('verified');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);

  // Only listen to adminNotifications history here - users come from the store
  useEffect(() => {
    const histRef = ref(database, 'adminNotifications');
    const unsub = onValue(histRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: NotificationHistory[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setHistory(list);
    });
    return () => unsub();
  }, []);

  const getSegmentUsers = () => {
    switch (targetSegment) {
      case 'verified': return allUsers.filter((u) => u.kycStatus === 'verified');
      case 'active': return allUsers.filter((u) => !u.isBlocked && u.lastLogin);
      case 'blocked': return allUsers.filter((u) => u.isBlocked);
      case 'non-kyc': return allUsers.filter((u) => !u.kycStatus || u.kycStatus === 'none');
      default: return allUsers;
    }
  };

  const handleSend = async () => {
    if (!title || !body) { showToast('يرجى ملء العنوان والمحتوى', 'error'); return; }
    setSending(true);
    try {
      const notifId = generateId();
      const notifData: any = {
        title, body, type: notifType,
        targetType, sentAt: new Date().toISOString(),
        sentBy: adminUser?.uid || '', sentByName: adminUser?.displayName || '',
        icon: icon || '', data: dataUrl || '',
      };

      if (targetType === 'all') {
        // Save to admin notification history
        await set(ref(database, `adminNotifications/${notifId}`), { ...notifData, recipientCount: allUsers.length, deliveryCount: 0, status: 'sent' });

        // Save to each user's notifications (direct path, no inbox sub-key)
        let deliveryCount = 0;
        const batchSize = 50;
        for (let i = 0; i < allUsers.length; i += batchSize) {
          const batch = allUsers.slice(i, i + batchSize);
          const updates: Record<string, any> = {};
          batch.forEach((user) => {
            updates[`notifications/${user.uid}/${notifId}`] = {
              id: notifId, title, body, type: notifType, isRead: false,
              createdAt: new Date().toISOString(), icon: icon || '', data: dataUrl || '',
            };
            deliveryCount++;
          });
          await update(ref(database), updates);
        }

        // Send FCM push notifications to all users with tokens
        try {
          const tokens: string[] = [];
          allUsers.forEach((user) => {
            if (user.fcmToken) tokens.push(user.fcmToken);
          });
          if (tokens.length > 0) {
            await sendFCMDirect(tokens, title, body, notifType, dataUrl ? { url: dataUrl } : undefined);
          }
        } catch (pushError) {
          console.warn('FCM push failed:', pushError);
        }

        // Update delivery count
        await update(ref(database, `adminNotifications/${notifId}`), { deliveryCount });
        showToast(`تم إرسال الإشعار لجميع المستخدمين (${allUsers.length})`, 'success');

      } else if (targetType === 'specific') {
        let targetUser = null;
        if (targetUserId) targetUser = allUsers.find((u) => u.uid === targetUserId || u.userId === targetUserId);
        else if (targetPhone) targetUser = allUsers.find((u) => u.phone === targetPhone);

        if (!targetUser) { showToast('لم يتم العثور على المستخدم', 'error'); setSending(false); return; }

        await set(ref(database, `adminNotifications/${notifId}`), { ...notifData, type: notifType, targetUid: targetUser.uid, recipientCount: 1, deliveryCount: 1, status: 'sent' });
        await set(ref(database, `notifications/${targetUser.uid}/${notifId}`), {
          id: notifId, title, body, type: notifType, isRead: false,
          createdAt: new Date().toISOString(), icon: icon || '', data: dataUrl || '',
        });
        // Send FCM push notification to the specific user
        try {
          if (targetUser.fcmToken) {
            await sendFCMDirect([targetUser.fcmToken], title, body, notifType, dataUrl ? { url: dataUrl } : undefined);
          }
        } catch (pushError) {
          console.warn('FCM push failed:', pushError);
        }
        showToast('تم إرسال الإشعار للمستخدم', 'success');

      } else if (targetType === 'segment') {
        const segmentUsers = getSegmentUsers();
        await set(ref(database, `adminNotifications/${notifId}`), { ...notifData, targetSegment, recipientCount: segmentUsers.length, deliveryCount: 0, status: 'sent' });

        let deliveryCount = 0;
        const batchSize = 50;
        for (let i = 0; i < segmentUsers.length; i += batchSize) {
          const batch = segmentUsers.slice(i, i + batchSize);
          const updates: Record<string, any> = {};
          batch.forEach((user) => {
            updates[`notifications/${user.uid}/${notifId}`] = {
              id: notifId, title, body, type: notifType, isRead: false,
              createdAt: new Date().toISOString(), icon: icon || '', data: dataUrl || '',
            };
            deliveryCount++;
          });
          await update(ref(database), updates);
        }
        // Send FCM push notifications to segment users
        try {
          const tokens: string[] = [];
          segmentUsers.forEach((user) => {
            if (user.fcmToken) tokens.push(user.fcmToken);
          });
          if (tokens.length > 0) {
            await sendFCMDirect(tokens, title, body, notifType, dataUrl ? { url: dataUrl } : undefined);
          }
        } catch (pushError) {
          console.warn('FCM push failed:', pushError);
        }
        await update(ref(database, `adminNotifications/${notifId}`), { deliveryCount });
        showToast(`تم إرسال الإشعار لـ ${segmentUsers.length} مستخدم`, 'success');
      }

      setTitle(''); setBody(''); setIcon(''); setDataUrl('');
      setTargetUserId(''); setTargetPhone('');
    } catch (e) { showToast('حدث خطأ في إرسال الإشعار', 'error'); }
    finally { setSending(false); }
  };

  const typeLabels: Record<string, string> = { info: 'معلومات', transaction: 'معاملة', security: 'أمان', promo: 'ترويجي' };
  const typeColors: Record<string, string> = { info: 'bg-blue-500/20 text-blue-600', transaction: 'bg-green-500/20 text-green-600', security: 'bg-red-500/20 text-red-600', promo: 'bg-purple-500/20 text-purple-600' };
  const segmentLabels: Record<string, string> = { verified: 'موثقين', active: 'نشطين', blocked: 'محظورين', 'non-kyc': 'غير موثقين' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إرسال إشعارات</h1>
        <p className="text-muted-foreground text-sm mt-1">إرسال إشعارات فورية للمستخدمين</p>
      </div>

      <Tabs defaultValue="send">
        <TabsList className="w-full">
          <TabsTrigger value="send" className="flex-1">إرسال إشعار</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">سجل الإشعارات</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10">
                  <Send className="w-6 h-6 text-purple-500" />
                  <div>
                    <p className="font-medium text-sm">إرسال إشعار جديد</p>
                    <p className="text-xs text-muted-foreground">يتم حفظ الإشعار في صندوق كل مستخدم وفي طابور FCM</p>
                  </div>
                </div>

                <div><Label>نوع الإشعار</Label>
                  <Select value={notifType} onValueChange={(v: any) => setNotifType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">معلومات</SelectItem>
                      <SelectItem value="transaction">معاملة</SelectItem>
                      <SelectItem value="security">أمان</SelectItem>
                      <SelectItem value="promo">ترويجي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div><Label>نوع الإرسال</Label>
                  <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> لجميع المستخدمين</div></SelectItem>
                      <SelectItem value="specific"><div className="flex items-center gap-2"><User className="w-4 h-4" /> لمستخدم محدد</div></SelectItem>
                      <SelectItem value="segment"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> لشريحة محددة</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {targetType === 'specific' && (
                  <div className="space-y-3">
                    <div><Label>معرف المستخدم</Label><Input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} dir="ltr" /></div>
                    <div className="text-center text-xs text-muted-foreground">أو</div>
                    <div><Label>رقم الهاتف</Label><Input value={targetPhone} onChange={(e) => setTargetPhone(e.target.value)} dir="ltr" /></div>
                  </div>
                )}

                {targetType === 'segment' && (
                  <div>
                    <Label>الشريحة المستهدفة</Label>
                    <Select value={targetSegment} onValueChange={setTargetSegment}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">موثقين</SelectItem>
                        <SelectItem value="active">نشطين</SelectItem>
                        <SelectItem value="blocked">محظورين</SelectItem>
                        <SelectItem value="non-kyc">غير موثقين</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">{formatNumber(getSegmentUsers().length)} مستخدم في الشريحة</p>
                  </div>
                )}

                <div><Label>عنوان الإشعار</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>محتوى الإشعار</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[120px]" /></div>
                <div><Label>رابط أيقونة (اختياري)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} dir="ltr" /></div>
                <div><Label>رابط البيانات (اختياري)</Label><Input value={dataUrl} onChange={(e) => setDataUrl(e.target.value)} dir="ltr" /></div>

                <Button onClick={handleSend} disabled={sending || !title || !body} className="w-full bg-purple-600 hover:bg-purple-700">
                  {sending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                  إرسال الإشعار
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
            {history.map((notif, i) => (
              <motion.div key={notif.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-muted-foreground">{notif.body?.substring(0, 60)}...</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${typeColors[notif.type] || 'bg-gray-500/20'} text-xs`}>{typeLabels[notif.type] || notif.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {notif.targetType === 'all' ? 'للجميع' : notif.targetType === 'specific' ? 'لمستخدم' : `شريحة: ${segmentLabels[notif.targetSegment || ''] || notif.targetSegment}`}
                            </span>
                            {notif.deliveryCount !== undefined && (
                              <span className="text-xs text-green-600">تم التسليم: {notif.deliveryCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">{notif.sentAt ? formatDateAr(notif.sentAt) : ''}</p>
                        {notif.recipientCount && <p className="text-xs text-muted-foreground">({notif.recipientCount} مستلم)</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {history.length === 0 && <p className="text-center text-muted-foreground py-8">لا يوجد سجل إشعارات</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
