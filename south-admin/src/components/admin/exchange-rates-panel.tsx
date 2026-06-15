'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExchangeRatesPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [rates, setRates] = useState({ YER: 1, SAR: 410, USD: 1558 });
  const [commission, setCommission] = useState({ percentage: 2, minAmount: 100, maxAmount: 500000 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ratesRef = ref(database, 'adminSettings/exchangeRates');
    const unsub1 = onValue(ratesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setRates({ YER: data.YER || 1, SAR: data.SAR || 410, USD: data.USD || 1558 });
    });
    const commRef = ref(database, 'adminSettings/commissions');
    const unsub2 = onValue(commRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setCommission({ percentage: data.percentage || 2, minAmount: data.minAmount || 100, maxAmount: data.maxAmount || 500000 });
      setLoading(false);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/exchangeRates'), rates);
      await set(ref(database, 'adminSettings/commissions'), commission);
      showToast('تم حفظ الإعدادات', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">أسعار الصرف والعمولات</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة أسعار التحويل والعمولات</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-4">أسعار الصرف (قاعدة: 1 وحدة = X ريال يمني)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>الريال اليمني (YER)</Label>
                  <Input type="number" value={rates.YER} onChange={(e) => setRates({ ...rates, YER: parseFloat(e.target.value) || 0 })} dir="ltr" />
                </div>
                <div>
                  <Label>الريال السعودي (SAR)</Label>
                  <Input type="number" value={rates.SAR} onChange={(e) => setRates({ ...rates, SAR: parseFloat(e.target.value) || 0 })} dir="ltr" />
                </div>
                <div>
                  <Label>الدولار (USD)</Label>
                  <Input type="number" value={rates.USD} onChange={(e) => setRates({ ...rates, USD: parseFloat(e.target.value) || 0 })} dir="ltr" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">العمولات والحدود</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>نسبة العمولة (%)</Label>
                  <Input type="number" value={commission.percentage} onChange={(e) => setCommission({ ...commission, percentage: parseFloat(e.target.value) || 0 })} dir="ltr" />
                </div>
                <div>
                  <Label>الحد الأدنى للمعاملة</Label>
                  <Input type="number" value={commission.minAmount} onChange={(e) => setCommission({ ...commission, minAmount: parseFloat(e.target.value) || 0 })} dir="ltr" />
                </div>
                <div>
                  <Label>الحد الأقصى للمعاملة</Label>
                  <Input type="number" value={commission.maxAmount} onChange={(e) => setCommission({ ...commission, maxAmount: parseFloat(e.target.value) || 0 })} dir="ltr" />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ الإعدادات
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
