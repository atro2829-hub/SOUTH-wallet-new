'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit, Building2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BanksPanel() {
  const { showToast } = useAdminStore();
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#6C3CE1');
  const [isActive, setIsActive] = useState(true);
  const [iconBase64, setIconBase64] = useState('');

  useEffect(() => {
    const ref_ = ref(database, 'adminSettings/banks');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setBanks(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setIconBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!bankName) return;
    try {
      const data = { name: bankName, accountHolder, accountNumber, color, isActive, icon: iconBase64 };
      if (editing) {
        await update(ref(database, `adminSettings/banks/${editing.id}`), data);
        showToast('تم تحديث الحساب', 'success');
      } else {
        await push(ref(database, 'adminSettings/banks'), data);
        showToast('تم إضافة الحساب', 'success');
      }
      setDialog(false);
      setBankName(''); setAccountHolder(''); setAccountNumber(''); setColor('#6C3CE1'); setIsActive(true); setIconBase64(''); setEditing(null);
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try { await remove(ref(database, `adminSettings/banks/${id}`)); showToast('تم حذف الحساب', 'success'); }
    catch (e) { showToast('حدث خطأ', 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">الحسابات البنكية</h1><p className="text-muted-foreground text-sm mt-1">{formatNumber(banks.length)} حساب</p></div>
        <Button onClick={() => { setEditing(null); setBankName(''); setAccountHolder(''); setAccountNumber(''); setColor('#6C3CE1'); setIsActive(true); setIconBase64(''); setDialog(true); }} size="sm"><Plus className="w-4 h-4 ml-1" /> حساب جديد</Button>
      </div>

      <div className="space-y-3">
        {banks.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {b.icon ? (
                      <img src={b.icon} alt={b.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (b.color || '#6C3CE1') + '20' }}>
                        <Building2 className="w-5 h-5" style={{ color: b.color || '#6C3CE1' }} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.accountHolder} - {b.accountNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={b.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>{b.isActive ? 'نشط' : 'معطل'}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(b); setBankName(b.name || ''); setAccountHolder(b.accountHolder || '');
                      setAccountNumber(b.accountNumber || ''); setColor(b.color || '#6C3CE1');
                      setIsActive(b.isActive !== false); setIconBase64(b.icon || ''); setDialog(true);
                    }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {banks.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد حسابات بنكية</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'تعديل حساب' : 'إضافة حساب'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم البنك</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
            <div><Label>اسم صاحب الحساب</Label><Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} /></div>
            <div><Label>رقم الحساب</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} dir="ltr" /></div>
            <div>
              <Label>أيقونة البنك</Label>
              <div className="flex items-center gap-3 mt-1">
                <input type="file" accept="image/*" onChange={handleIconUpload} className="flex-1 text-sm" />
                {iconBase64 && (
                  <div className="relative">
                    <img src={iconBase64} alt="icon preview" className="w-12 h-12 rounded-lg object-cover border" />
                    <button
                      onClick={() => setIconBase64('')}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                    >x</button>
                  </div>
                )}
              </div>
            </div>
            <div><Label>اللون</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editing ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
