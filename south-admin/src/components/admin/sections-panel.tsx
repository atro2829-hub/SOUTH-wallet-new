'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { compressBase64Image } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Edit, Trash2, ChevronDown, ChevronUp, FolderPlus, Folder, ArrowLeft, Upload, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubSectionData {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  parentId: string;
  providerIds?: string[];
}

export default function SectionsPanel() {
  const { showToast } = useAdminStore();
  const [sections, setSections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [subDialog, setSubDialog] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [parentSection, setParentSection] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#9333EA');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [apiProviderId, setApiProviderId] = useState('');

  // Sub-section form
  const [subName, setSubName] = useState('');
  const [subIcon, setSubIcon] = useState('');
  const [subSortOrder, setSubSortOrder] = useState(0);
  const [subIsActive, setSubIsActive] = useState(true);

  useEffect(() => {
    const sectionsRef = ref(database, 'sections');
    const unsub = onValue(sectionsRef, (snapshot) => {
      setSections(snapshot.val() || {});
      setLoading(false);
    }, (error) => {
      console.error('[SectionsPanel] Firebase listen error:', error);
      showToast('خطأ في تحميل الأقسام من Firebase', 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [showToast]);

  const resetForm = () => {
    setName(''); setIcon(''); setColor('#9333EA'); setSortOrder(0); setIsActive(true); setApiProviderId(''); setEditing(null);
  };

  const resetSubForm = () => {
    setSubName(''); setSubIcon(''); setSubSortOrder(0); setSubIsActive(true); setEditingSub(null); setParentSection(null);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSub = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2000000) {
      showToast('حجم الصورة يجب أن يكون أقل من 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target?.result as string;
        // Compress to max 128x128 for Firebase RTDB size limits
        const compressed = await compressBase64Image(base64, 128, 0.7);
        if (isSub) {
          setSubIcon(compressed);
        } else {
          setIcon(compressed);
        }
        showToast('تم رفع الأيقونة بنجاح', 'success');
      } catch (err) {
        console.error('[SectionsPanel] Icon compression failed:', err);
        // Fallback to original if compression fails
        const base64 = ev.target?.result as string;
        if (isSub) {
          setSubIcon(base64);
        } else {
          setIcon(base64);
        }
        showToast('تم رفع الأيقونة (بدون ضغط)', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('يرجى إدخال الاسم', 'error'); return; }
    setSaving(true);
    try {
      const sectionId = editing || name.trim().toLowerCase().replace(/[\s]+/g, '-').replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, '') || `section-${Date.now()}`;
      const data: Record<string, any> = {
        id: sectionId,
        name: name.trim(),
        icon: icon || '',
        color,
        sortOrder,
        isActive,
        type: 'main',
        updatedAt: new Date().toISOString(),
      };
      if (apiProviderId.trim()) data.apiProviderId = apiProviderId.trim();

      // Use update() to avoid overwriting nested data like subSections
      await update(ref(database, `sections/${sectionId}`), data);
      showToast(editing ? 'تم تحديث القسم بنجاح' : 'تم إضافة القسم بنجاح', 'success');
      setDialog(false);
      resetForm();
    } catch (e) {
      console.error('[SectionsPanel] handleSave error:', e);
      showToast(`حدث خطأ أثناء الحفظ: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSub = async () => {
    if (!subName.trim() || !parentSection) { showToast('يرجى إدخال البيانات', 'error'); return; }
    setSaving(true);
    try {
      const subId = editingSub || subName.trim().toLowerCase().replace(/[\s]+/g, '-').replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, '') || `sub-${Date.now()}`;
      const data: SubSectionData & { updatedAt: string } = {
        id: subId,
        name: subName.trim(),
        icon: subIcon || '',
        sortOrder: subSortOrder,
        isActive: subIsActive,
        parentId: parentSection,
        updatedAt: new Date().toISOString(),
      };

      await update(ref(database, `sections/${parentSection}/subSections/${subId}`), data);
      showToast(editingSub ? 'تم تحديث القسم الفرعي بنجاح' : 'تم إضافة القسم الفرعي بنجاح', 'success');
      setSubDialog(false);
      resetSubForm();
    } catch (e) {
      console.error('[SectionsPanel] handleSaveSub error:', e);
      showToast(`حدث خطأ أثناء الحفظ: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try {
      await remove(ref(database, `sections/${id}`));
      showToast('تم حذف القسم بنجاح', 'success');
    } catch (e) {
      console.error('[SectionsPanel] handleDelete error:', e);
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleDeleteSub = async (sectionId: string, subId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم الفرعي؟')) return;
    try {
      await remove(ref(database, `sections/${sectionId}/subSections/${subId}`));
      showToast('تم حذف القسم الفرعي بنجاح', 'success');
    } catch (e) {
      console.error('[SectionsPanel] handleDeleteSub error:', e);
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleToggleActive = async (sectionId: string, active: boolean) => {
    try {
      await update(ref(database, `sections/${sectionId}`), {
        isActive: active,
        updatedAt: new Date().toISOString(),
      });
      showToast(active ? 'تم تفعيل القسم' : 'تم تعطيل القسم', 'success');
    } catch (e) {
      console.error('[SectionsPanel] handleToggleActive error:', e);
      showToast('حدث خطأ أثناء تحديث الحالة', 'error');
    }
  };

  const handleToggleSubActive = async (sectionId: string, subId: string, active: boolean) => {
    try {
      await update(ref(database, `sections/${sectionId}/subSections/${subId}`), {
        isActive: active,
        updatedAt: new Date().toISOString(),
      });
      showToast(active ? 'تم تفعيل القسم الفرعي' : 'تم تعطيل القسم الفرعي', 'success');
    } catch (e) {
      console.error('[SectionsPanel] handleToggleSubActive error:', e);
      showToast('حدث خطأ أثناء تحديث الحالة', 'error');
    }
  };

  // Reorder sections: move a section up or down by swapping sortOrder values
  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const sectionList = Object.entries(sections)
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const currentIndex = sectionList.findIndex(s => s.id === sectionId);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sectionList.length) return;

    const currentSection = sectionList[currentIndex];
    const targetSection = sectionList[targetIndex];

    try {
      // Swap sort orders
      const updates: Record<string, any> = {};
      updates[`sections/${currentSection.id}/sortOrder`] = targetSection.sortOrder || 0;
      updates[`sections/${currentSection.id}/updatedAt`] = new Date().toISOString();
      updates[`sections/${targetSection.id}/sortOrder`] = currentSection.sortOrder || 0;
      updates[`sections/${targetSection.id}/updatedAt`] = new Date().toISOString();

      await update(ref(database), updates);
      showToast('تم إعادة ترتيب الأقسام', 'success');
    } catch (e) {
      console.error('[SectionsPanel] handleMoveSection error:', e);
      showToast('حدث خطأ أثناء إعادة الترتيب', 'error');
    }
  };

  const sectionList = Object.entries(sections)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const filteredSections = sectionList.filter(s => !search || s.name?.includes(search));

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الأقسام</h1>
          <p className="text-muted-foreground text-sm mt-1">{sectionList.length} قسم</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialog(true); }}>
          <Plus className="w-4 h-4 ml-1" /> قسم جديد
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {filteredSections.map((section, i) => {
          const isExpanded = expandedSection === section.id;
          const subSections = section.subSections || {};
          const subCount = Object.keys(subSections).length;

          return (
            <motion.div key={section.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
              <Card className="admin-card border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: section.icon ? 'transparent' : (section.color || '#9333EA') + '20' }}>
                        {section.icon ? (
                          <img src={section.icon} alt="" className="w-full h-full object-contain rounded-lg" />
                        ) : (
                          <Folder className="w-5 h-5" style={{ color: section.color || '#9333EA' }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{section.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0">الترتيب: {section.sortOrder}</Badge>
                          {subCount > 0 && <Badge variant="outline" className="text-[10px] py-0">{subCount} قسم فرعي</Badge>}
                          {section.apiProviderId && <Badge variant="outline" className="text-[10px] py-0">API: {section.apiProviderId}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Reorder buttons */}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => handleMoveSection(section.id, 'up')} title="نقل للأعلى">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={i === filteredSections.length - 1} onClick={() => handleMoveSection(section.id, 'down')} title="نقل للأسفل">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Switch checked={section.isActive !== false} onCheckedChange={(v) => handleToggleActive(section.id, v)} />
                      <Button variant="ghost" size="sm" onClick={() => {
                        setParentSection(section.id);
                        resetSubForm();
                        setSubDialog(true);
                      }} title="إضافة قسم فرعي">
                        <FolderPlus className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setExpandedSection(isExpanded ? null : section.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditing(section.id);
                        setName(section.name || '');
                        setIcon(section.icon || '');
                        setColor(section.color || '#9333EA');
                        setSortOrder(section.sortOrder || 0);
                        setIsActive(section.isActive !== false);
                        setApiProviderId(section.apiProviderId || '');
                        setDialog(true);
                      }}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(section.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>

                  {/* Sub-sections */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          {subCount > 0 ? (
                            Object.entries(subSections)
                              .map(([subId, sub]: [string, any]) => ({ subId, ...sub }))
                              .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
                              .map((sub: any) => (
                              <div key={sub.subId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                                    {sub.icon ? (
                                      <img src={sub.icon} alt="" className="w-full h-full object-contain rounded" />
                                    ) : (
                                      <Folder className="w-3 h-3 text-muted-foreground" />
                                    )}
                                  </div>
                                  <span className="text-xs font-medium truncate">{sub.name}</span>
                                  <Badge variant="outline" className="text-[9px] py-0">{sub.sortOrder}</Badge>
                                  <Badge className={sub.isActive !== false ? 'bg-green-500/20 text-green-600 text-[9px] py-0' : 'bg-red-500/20 text-red-500 text-[9px] py-0'}>
                                    {sub.isActive !== false ? 'نشط' : 'معطل'}
                                  </Badge>
                                  {sub.apiProviderId && <Badge variant="outline" className="text-[9px] py-0">API: {sub.apiProviderId}</Badge>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Switch checked={sub.isActive !== false} onCheckedChange={(v) => handleToggleSubActive(section.id, sub.subId, v)} />
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                                    setParentSection(section.id);
                                    setEditingSub(sub.subId);
                                    setSubName(sub.name || '');
                                    setSubIcon(sub.icon || '');
                                    setSubSortOrder(sub.sortOrder || 0);
                                    setSubIsActive(sub.isActive !== false);
                                    setSubDialog(true);
                                  }}><Edit className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteSub(section.id, sub.subId)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">لا توجد أقسام فرعية</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {filteredSections.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد أقسام</p>}
      </div>

      {/* Section Dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'تعديل القسم' : 'إضافة قسم'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: خدمات الاتصالات" /></div>
            {/* Icon Upload - with compression */}
            <div>
              <Label>الأيقونة</Label>
              <div className="flex items-center gap-3 mt-1">
                {icon ? (
                  <div className="relative">
                    <img src={icon} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <button
                      type="button"
                      onClick={() => setIcon('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}
                <Button variant="outline" size="sm" asChild>
                  <label><Upload className="w-4 h-4 ml-1" /> رفع أيقونة<input type="file" accept="image/*" className="hidden" onChange={(e) => handleIconUpload(e, false)} /></label>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">سيتم ضغط الصورة تلقائياً (128x128) لتسريع التحميل</p>
            </div>
            <div><Label>اللون</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
            <div><Label>ترتيب الفرز</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
            <div><Label>معرف API المزود (اختياري)</Label><Input value={apiProviderId} onChange={(e) => setApiProviderId(e.target.value)} placeholder="__all__ لمزودين API" dir="ltr" /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Section Dialog */}
      <Dialog open={subDialog} onOpenChange={(open) => { setSubDialog(open); if (!open) resetSubForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSub ? 'تعديل القسم الفرعي' : 'إضافة قسم فرعي'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">القسم الرئيسي: {sections[parentSection!]?.name || parentSection}</span>
            </div>
            <div><Label>الاسم</Label><Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="مثال: ألعاب إطلاق النار" /></div>
            {/* Icon Upload for sub-section - with compression */}
            <div>
              <Label>الأيقونة</Label>
              <div className="flex items-center gap-3 mt-1">
                {subIcon && (
                  <div className="relative">
                    <img src={subIcon} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <button type="button" onClick={() => setSubIcon('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <Button variant="outline" size="sm" asChild>
                  <label><Upload className="w-4 h-4 ml-1" /> رفع أيقونة<input type="file" accept="image/*" className="hidden" onChange={(e) => handleIconUpload(e, true)} /></label>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">سيتم ضغط الصورة تلقائياً (128x128)</p>
            </div>
            <div><Label>ترتيب الفرز</Label><Input type="number" value={subSortOrder} onChange={(e) => setSubSortOrder(Number(e.target.value))} /></div>
            <div className="flex items-center gap-2"><Switch checked={subIsActive} onCheckedChange={setSubIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSubDialog(false); resetSubForm(); }}>إلغاء</Button>
            <Button onClick={handleSaveSub} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
              {editingSub ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
