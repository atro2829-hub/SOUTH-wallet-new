'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Eye, EyeOff, Layers, Server, Zap, Folder, FolderPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface SectionMeta {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  subSections?: Record<string, SubSectionMeta>;
}

interface SubSectionMeta {
  id: string;
  name: string;
  icon?: string;
  parentId?: string;
}

interface ProviderMeta {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  categoryId?: string;
  sectionId?: string;
  subSectionId?: string;
}

export default function VisibilityPanel() {
  const { showToast } = useAdminStore();

  // Visibility state — mirrors adminSettings/visibility/{sections,providers,features}
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({
    transfer: true,
    exchange: true,
    deposit: true,
    withdraw: true,
    kyc: true,
    support: true,
    giftCodes: true,
    promoCodes: true,
    savings: true,
    investments: true,
  });

  // Metadata for display names (from sections and providers)
  const [sectionMeta, setSectionMeta] = useState<SectionMeta[]>([]);
  const [providerMeta, setProviderMeta] = useState<ProviderMeta[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Read visibility settings from adminSettings/visibility
  useEffect(() => {
    const visRef = ref(database, 'adminSettings/visibility');
    const unsub = onValue(visRef, (snapshot) => {
      const data = snapshot.val() || {};
      const secData = data.sections || {};
      const provData = data.providers || {};
      const featData = data.features || {};

      setSections(secData);
      setProviders(provData);
      setFeatures({
        transfer: featData.transfer !== false,
        exchange: featData.exchange !== false,
        deposit: featData.deposit !== false,
        withdraw: featData.withdraw !== false,
        kyc: featData.kyc !== false,
        support: featData.support !== false,
        giftCodes: featData.giftCodes !== false,
        promoCodes: featData.promoCodes !== false,
        savings: featData.savings !== false,
        investments: featData.investments !== false,
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Read section metadata from sections/ (same path as user app)
  useEffect(() => {
    const secRef = ref(database, 'sections');
    const unsub = onValue(secRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: SectionMeta[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        name: val.name || id,
        icon: val.icon || '',
        color: val.color || '',
        subSections: val.subSections || undefined,
      }));
      setSectionMeta(list);
    });
    return () => unsub();
  }, []);

  // Read provider metadata from providers/
  useEffect(() => {
    const provRef = ref(database, 'providers');
    const unsub = onValue(provRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: ProviderMeta[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        name: val.name || id,
        icon: val.icon || '',
        color: val.color || '',
        categoryId: val.categoryId || '',
        sectionId: val.sectionId || '',
        subSectionId: val.subSectionId || '',
      }));
      setProviderMeta(list);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {};

      // Write sections visibility
      Object.entries(sections).forEach(([key, val]) => {
        updates[`adminSettings/visibility/sections/${key}`] = val;
      });

      // Write providers visibility
      Object.entries(providers).forEach(([key, val]) => {
        updates[`adminSettings/visibility/providers/${key}`] = val;
      });

      // Write features visibility
      Object.entries(features).forEach(([key, val]) => {
        updates[`adminSettings/visibility/features/${key}`] = val;
      });

      await update(ref(database), updates);
      showToast('تم حفظ إعدادات الظهور', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const featureItems = [
    { key: 'transfer', label: 'التحويل', desc: 'إظهار أو إخفاء ميزة التحويل' },
    { key: 'exchange', label: 'الصرف', desc: 'إظهار أو إخفاء ميزة الصرف' },
    { key: 'deposit', label: 'الإيداع', desc: 'إظهار أو إخفاء ميزة الإيداع' },
    { key: 'withdraw', label: 'السحب', desc: 'إظهار أو إخفاء ميزة السحب' },
    { key: 'kyc', label: 'التحقق', desc: 'إظهار أو إخفاء ميزة التحقق' },
    { key: 'support', label: 'الدعم', desc: 'إظهار أو إخفاء الدعم المباشر' },
    { key: 'giftCodes', label: 'أكواد الهدايا', desc: 'إظهار أو إخفاء أكواد الهدايا' },
    { key: 'promoCodes', label: 'أكواد الخصم', desc: 'إظهار أو إخفاء أكواد الخصم' },
    { key: 'savings', label: 'التوفير', desc: 'إظهار أو إخفاء ميزة التوفير' },
    { key: 'investments', label: 'الاستثمار', desc: 'إظهار أو إخفاء ميزة الاستثمار' },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الظهور</h1>
        <p className="text-muted-foreground text-sm mt-1">التحكم بإظهار وإخفاء الأقسام والمزودين والميزات</p>
      </div>

      {/* Sections Visibility */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              ظهور الأقسام
            </CardTitle>
            <p className="text-xs text-muted-foreground">إظهار أو إخفاء الأقسام والأقسام الفرعية للمستخدمين</p>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {sectionMeta.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد أقسام. أضف أقسام من لوحة إدارة الأقسام.</p>
            )}
            {sectionMeta.map((sec) => {
              const isVisible = sections[sec.id] !== false;
              const subSections = sec.subSections || {};
              const subKeys = Object.keys(subSections);
              return (
                <div key={sec.id} className="rounded-xl bg-muted/30 overflow-hidden">
                  {/* Main section toggle */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      {sec.icon ? (
                        <img src={sec.icon} alt="" className="w-5 h-5 object-contain rounded" />
                      ) : (
                        <Folder className="w-5 h-5" style={{ color: sec.color || '#9333EA' }} />
                      )}
                      <div>
                        <p className="text-sm font-medium">{sec.name}</p>
                        <p className="text-xs text-muted-foreground">المعرف: {sec.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isVisible ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-red-500" />
                      )}
                      <Switch
                        checked={isVisible}
                        onCheckedChange={(checked) => setSections({ ...sections, [sec.id]: checked })}
                      />
                    </div>
                  </div>
                  {/* Sub-sections toggles */}
                  {subKeys.length > 0 && (
                    <div className="border-t border-border/30 px-3 pb-2 pt-1 space-y-1.5">
                      {subKeys.map((subKey) => {
                        const sub = subSections[subKey];
                        const subVisKey = `${sec.id}/${subKey}`;
                        const isSubVisible = sections[subVisKey] !== false && sections[sec.id] !== false;
                        return (
                          <div key={subKey} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                            <div className="flex items-center gap-2">
                              {sub.icon ? (
                                <img src={sub.icon} alt="" className="w-4 h-4 object-contain rounded" />
                              ) : (
                                <FolderPlus className="w-4 h-4 text-muted-foreground" />
                              )}
                              <div>
                                <p className="text-xs font-medium">{sub.name}</p>
                                <p className="text-[10px] text-muted-foreground">{subKey}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSubVisible ? (
                                <Eye className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-red-500" />
                              )}
                              <Switch
                                checked={isSubVisible}
                                onCheckedChange={(checked) => setSections({ ...sections, [subVisKey]: checked })}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Providers Visibility */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="admin-card border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              ظهور المزودين
            </CardTitle>
            <p className="text-xs text-muted-foreground">إظهار أو إخفاء المزودين للمستخدمين</p>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
            {providerMeta.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مزودون. أضف مزودين من لوحة إدارة المزودين.</p>
            )}
            {providerMeta.map((prov) => {
              const isVisible = providers[prov.id] !== false;
              return (
                <div key={prov.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    {prov.icon ? (
                      <img src={prov.icon} alt="" className="w-5 h-5 object-contain rounded" />
                    ) : (
                      <Server className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{prov.name}</p>
                      <p className="text-xs text-muted-foreground">المعرف: {prov.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVisible ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-red-500" />
                    )}
                    <Switch
                      checked={isVisible}
                      onCheckedChange={(checked) => setProviders({ ...providers, [prov.id]: checked })}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Features Visibility */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="admin-card border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              ظهور الميزات
            </CardTitle>
            <p className="text-xs text-muted-foreground">إظهار أو إخفاء الميزات للمستخدمين</p>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {featureItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  {features[item.key] ? (
                    <Eye className="w-5 h-5 text-green-500" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={features[item.key]}
                  onCheckedChange={(checked) => setFeatures({ ...features, [item.key]: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700">
        {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
        حفظ الإعدادات
      </Button>
    </div>
  );
}
