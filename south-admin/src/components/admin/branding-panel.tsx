'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Palette,
  Save,
  Upload,
  Check,
  Loader2,
  Image as ImageIcon,
  Smartphone,
  CreditCard,
  Type,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';

export default function BrandingPanel() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // App icon (base64)
  const [appIcon, setAppIcon] = useState('');
  const [appIconPreview, setAppIconPreview] = useState('');

  // Splash screen image (base64)
  const [splashImage, setSplashImage] = useState('');
  const [splashPreview, setSplashPreview] = useState('');

  // Balance card background (base64)
  const [cardBgImage, setCardBgImage] = useState('');
  const [cardBgPreview, setCardBgPreview] = useState('');

  // App name
  const [appName, setAppName] = useState('محفظة الجنوب');
  const [appNameEn, setAppNameEn] = useState('South Wallet');

  // Colors
  const [primaryColor, setPrimaryColor] = useState('#5C1A1B');
  const [secondaryColor, setSecondaryColor] = useState('#3D0F10');
  const [accentColor, setAccentColor] = useState('#8B5CF6');

  // Load existing branding from Firebase
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const snapshot = await get(ref(database, 'ownerSettings/branding'));
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.appIcon) { setAppIcon(data.appIcon); setAppIconPreview(data.appIcon); }
          if (data.splashImage) { setSplashImage(data.splashImage); setSplashPreview(data.splashImage); }
          if (data.cardBgImage) { setCardBgImage(data.cardBgImage); setCardBgPreview(data.cardBgImage); }
          if (data.appName) setAppName(data.appName);
          if (data.appNameEn) setAppNameEn(data.appNameEn);
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
          if (data.accentColor) setAccentColor(data.accentColor);
        }
      } catch (error) {
        console.error('Error loading branding:', error);
      }
      setIsLoading(false);
    };
    loadBranding();
  }, []);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    previewSetter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setter(base64);
      previewSetter(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const brandingData: Record<string, string> = {
        appName,
        appNameEn,
        primaryColor,
        secondaryColor,
        accentColor,
        updatedAt: new Date().toISOString(),
      };
      if (appIcon) brandingData.appIcon = appIcon;
      if (splashImage) brandingData.splashImage = splashImage;
      if (cardBgImage) brandingData.cardBgImage = cardBgImage;

      await update(ref(database, 'ownerSettings/branding'), brandingData);

      // Also update the project config app name
      await update(ref(database, 'ownerSettings/projectConfig'), {
        appName,
        appNameEn,
        primaryColor,
        secondaryColor,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving branding:', error);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div>
        <h1 className="ios-large-title text-foreground">العلامة التجارية</h1>
        <p className="text-muted-foreground text-sm mt-1">تخصيص أيقونة التطبيق وصفحة البداية وبطاقات الأرصدة وألوان العلامة التجارية</p>
      </div>

      {/* Success */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20"
          >
            <Check className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm font-medium text-green-500">تم حفظ التغييرات بنجاح</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Icon */}
      <div className="ios-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10">
            <Smartphone className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">أيقونة التطبيق</h3>
            <p className="text-xs text-muted-foreground">الصورة التي تظهر على شاشة الهاتف (يفضل 512x512 PNG)</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border-2 border-dashed border-border/50"
            style={{ background: appIconPreview ? 'transparent' : 'rgba(92,26,27,0.05)' }}
          >
            {appIconPreview ? (
              <img src={appIconPreview} alt="App Icon" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex-1">
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-500 text-sm font-medium cursor-pointer active:scale-[0.98] transition-transform">
              <Upload className="w-4 h-4" />
              رفع أيقونة
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleImageUpload(e, setAppIcon, setAppIconPreview)} className="hidden" />
            </label>
            {appIcon && (
              <button
                onClick={() => { setAppIcon(''); setAppIconPreview(''); }}
                className="mt-2 text-xs text-red-500 hover:underline"
              >
                إزالة الأيقونة
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Splash Screen */}
      <div className="ios-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10">
            <ImageIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">صفحة البداية (Splash)</h3>
            <p className="text-xs text-muted-foreground">الصورة التي تظهر عند فتح التطبيق</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div
            className="w-24 h-40 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border-2 border-dashed border-border/50"
            style={{ background: splashPreview ? 'transparent' : `linear-gradient(135deg, ${primaryColor}22, ${secondaryColor}22)` }}
          >
            {splashPreview ? (
              <img src={splashPreview} alt="Splash" className="w-full h-full object-cover" />
            ) : (
              <Smartphone className="w-8 h-8 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex-1">
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 text-sm font-medium cursor-pointer active:scale-[0.98] transition-transform">
              <Upload className="w-4 h-4" />
              رفع صورة البداية
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleImageUpload(e, setSplashImage, setSplashPreview)} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Balance Card Background */}
      <div className="ios-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10">
            <CreditCard className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">خلفية بطاقات الأرصدة</h3>
            <p className="text-xs text-muted-foreground">الصورة التي تظهر كخلفية لبطاقات الرصيد في التطبيق</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="w-32 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border-2 border-dashed border-border/50"
            style={{ background: cardBgPreview ? 'transparent' : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            {cardBgPreview ? (
              <img src={cardBgPreview} alt="Card BG" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-[10px]">بطاقة الرصيد</span>
            )}
          </div>
          <div className="flex-1">
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium cursor-pointer active:scale-[0.98] transition-transform">
              <Upload className="w-4 h-4" />
              رفع خلفية البطاقة
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleImageUpload(e, setCardBgImage, setCardBgPreview)} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* App Name */}
      <div className="ios-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/10">
            <Type className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">اسم التطبيق</h3>
            <p className="text-xs text-muted-foreground">الاسم الذي يظهر في التطبيق والشاشة الرئيسية</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">الاسم بالعربية</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">الاسم بالإنجليزية</label>
            <input
              type="text"
              value={appNameEn}
              onChange={(e) => setAppNameEn(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="ios-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10">
            <Palette className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">ألوان العلامة التجارية</h3>
            <p className="text-xs text-muted-foreground">الألوان الرئيسية للتطبيق</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
            <div className="flex-1">
              <span className="text-sm text-foreground">اللون الرئيسي</span>
              <span className="text-xs text-muted-foreground ml-2" dir="ltr">{primaryColor}</span>
            </div>
            <div className="w-8 h-8 rounded-lg" style={{ background: primaryColor }} />
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
            <div className="flex-1">
              <span className="text-sm text-foreground">اللون الثانوي</span>
              <span className="text-xs text-muted-foreground ml-2" dir="ltr">{secondaryColor}</span>
            </div>
            <div className="w-8 h-8 rounded-lg" style={{ background: secondaryColor }} />
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
            <div className="flex-1">
              <span className="text-sm text-foreground">لون التمييز</span>
              <span className="text-xs text-muted-foreground ml-2" dir="ltr">{accentColor}</span>
            </div>
            <div className="w-8 h-8 rounded-lg" style={{ background: accentColor }} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="ios-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">معاينة</h3>
        <div className="flex items-center gap-4">
          {/* App icon preview */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: appIconPreview ? 'transparent' : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              {appIconPreview ? (
                <img src={appIconPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-bold">{appName.charAt(0)}</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{appName}</span>
          </div>

          {/* Card preview */}
          <div
            className="flex-1 h-16 rounded-xl flex items-center px-4 overflow-hidden"
            style={{ background: cardBgPreview ? `url(${cardBgPreview}) center/cover` : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <div className="text-white">
              <p className="text-xs font-bold">{appName}</p>
              <p className="text-[10px] opacity-70">بطاقة الرصيد</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={cn(
          "w-full py-3 rounded-2xl bg-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2",
          isSaving && "opacity-70 cursor-not-allowed"
        )}
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ' : 'حفظ التغييرات'}
      </button>
    </div>
  );
}
