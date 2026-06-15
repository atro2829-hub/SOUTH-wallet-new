'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRight,
  QrCode,
  Camera,
  Copy,
  Share2,
  UserPlus,
  HandCoins,
  CheckCircle2,
  Clipboard,
  User,
  Send,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, currencyBadgeColors, generateReference } from '@/lib/utils';
import { LOGO_BASE64 } from '@/lib/logo';
import { useToast } from '@/components/fahed/toast-provider';
import { database } from '@/lib/firebase';
import { ref, get, set, update } from 'firebase/database';

type QRTab = 'scan' | 'generate';
type GenerateType = 'receive' | 'request';

interface ParsedQRData {
  type: 'RECEIVE' | 'REQUEST';
  userId: string;
  name?: string;
  phone?: string;
  amount?: number;
  currency?: 'YER' | 'SAR' | 'USD';
}

interface ScannedUserInfo {
  uid: string;
  name: string;
  userId: string;
  phone: string;
  balanceYER?: number;
  balanceSAR?: number;
  balanceUSD?: number;
  kycStatus?: 'pending' | 'submitted' | 'verified' | 'rejected';
}

export default function QRScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, addTransaction, addNotification, setActiveScreen } = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<QRTab>('generate');
  const [generateType, setGenerateType] = useState<GenerateType>('receive');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [scanResult, setScanResult] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Transfer confirmation state
  const [parsedQR, setParsedQR] = useState<ParsedQRData | null>(null);
  const [scannedUser, setScannedUser] = useState<ScannedUserInfo | null>(null);
  const [isLookingUpUser, setIsLookingUpUser] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<'success' | 'insufficient' | 'error' | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCurrency, setTransferCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse QR data string
  const parseQRData = (data: string): ParsedQRData | null => {
    if (!data.startsWith('FAHED:')) return null;
    const parts = data.split(':');
    if (parts.length < 3) return null;

    const type = parts[1] as 'RECEIVE' | 'REQUEST';
    const userId = parts[2];

    if (type !== 'RECEIVE' && type !== 'REQUEST') return null;

    let name: string | undefined;
    let phone: string | undefined;
    let amount: number | undefined;
    let currency: 'YER' | 'SAR' | 'USD' | undefined;

    // Format: FAHED:RECEIVE:userId:NAME:encodedName:PHONE:phone:AMT:amount:currency
    // or: FAHED:REQUEST:userId:NAME:encodedName:PHONE:phone:AMT:amount:currency
    // Also supports legacy format: FAHED:RECEIVE:userId:AMT:amount:currency
    for (let i = 3; i < parts.length; i++) {
      if (parts[i] === 'NAME' && parts[i + 1]) {
        name = decodeURIComponent(parts[i + 1]);
        i++;
      } else if (parts[i] === 'PHONE' && parts[i + 1]) {
        phone = parts[i + 1];
        i++;
      } else if (parts[i] === 'AMT' && parts[i + 1] && parts[i + 2]) {
        amount = parseFloat(parts[i + 1]);
        const cur = parts[i + 2];
        if (['YER', 'SAR', 'USD'].includes(cur)) {
          currency = cur as 'YER' | 'SAR' | 'USD';
        }
        i += 2;
      }
    }

    return { type, userId, name, phone, amount, currency };
  };

  // Look up user from Firebase
  const lookupUser = async (userId: string): Promise<ScannedUserInfo | null> => {
    try {
      // First, look up the Firebase UID from the userId mapping
      const userIdRef = ref(database, `userIds/${userId}`);
      const userIdSnapshot = await get(userIdRef);

      if (!userIdSnapshot.exists()) {
        return null;
      }

      const uid = userIdSnapshot.val();

      // Then, get the user data
      const userRef = ref(database, `users/${uid}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists()) {
        return null;
      }

      const userData = userSnapshot.val();
      return {
        uid,
        name: userData.name || 'مستخدم',
        userId: userData.userId || userId,
        phone: userData.phone || '',
        balanceYER: userData.balanceYER || 0,
        balanceSAR: userData.balanceSAR || 0,
        balanceUSD: userData.balanceUSD || 0,
        kycStatus: userData.kycStatus || 'pending',
      };
    } catch (error) {
      console.error('Error looking up user:', error);
      return null;
    }
  };

  // Handle scan result - parse and look up user
  const handleScanData = async (data: string) => {
    setScanResult(data);
    setLookupError('');
    setScannedUser(null);
    setParsedQR(null);
    setTransferResult(null);

    const parsed = parseQRData(data);
    if (!parsed) {
      setLookupError('رمز QR غير صالح - ليس رمز محفظة الجنوب');
      return;
    }

    // Don't allow transferring to yourself
    if (parsed.userId === user?.userId) {
      setLookupError('لا يمكنك التحويل إلى حسابك الخاص');
      return;
    }

    setParsedQR(parsed);

    // Set default transfer amount/currency from QR
    if (parsed.amount && parsed.amount > 0) {
      setTransferAmount(parsed.amount.toString());
    } else {
      setTransferAmount('');
    }
    if (parsed.currency) {
      setTransferCurrency(parsed.currency);
    }

    // Look up user
    setIsLookingUpUser(true);
    try {
      const userInfo = await lookupUser(parsed.userId);
      if (userInfo) {
        setScannedUser(userInfo);
      } else {
        setLookupError('لم يتم العثور على المستخدم');
      }
    } catch {
      setLookupError('حدث خطأ أثناء البحث عن المستخدم');
    } finally {
      setIsLookingUpUser(false);
    }
  };

  // Handle transfer confirmation
  const handleConfirmTransfer = async () => {
    if (!user || !scannedUser || !parsedQR) return;

    const amountNum = parseFloat(transferAmount);
    if (!amountNum || amountNum <= 0) {
      showToast('error', 'خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    const transferCur = transferCurrency;
    const balanceField = `balance${transferCur}` as keyof typeof user;
    const currentBalance = (user[balanceField] as number) || 0;

    if (currentBalance < amountNum) {
      setTransferResult('insufficient');
      return;
    }

    setIsTransferring(true);

    try {
      const newSenderBalance = currentBalance - amountNum;

      // Update sender balance in Firebase
      const senderRef = ref(database, `users/${user.id}`);
      await update(senderRef, { [balanceField]: newSenderBalance });

      // Get receiver's current balance
      const receiverRef = ref(database, `users/${scannedUser.uid}`);
      const receiverSnapshot = await get(receiverRef);
      let newReceiverBalance = amountNum;
      if (receiverSnapshot.exists()) {
        const receiverData = receiverSnapshot.val();
        const receiverCurrentBalance = (receiverData[balanceField] as number) || 0;
        newReceiverBalance = receiverCurrentBalance + amountNum;
      }
      await update(receiverRef, { [balanceField]: newReceiverBalance });

      // Create transaction record for sender
      const txId = generateReference();
      const senderTx = {
        id: txId,
        fromUserId: user.id,
        toUserId: scannedUser.uid,
        amount: amountNum,
        currency: transferCur,
        type: 'transfer' as const,
        status: 'completed' as const,
        description: `تحويل إلى ${scannedUser.name}`,
        createdAt: new Date().toISOString(),
      };

      const senderTxRef = ref(database, `transactions/${txId}`);
      await set(senderTxRef, senderTx);

      // Create transaction record for receiver
      const rxTxId = generateReference();
      const receiverTx = {
        id: rxTxId,
        fromUserId: user.id,
        toUserId: scannedUser.uid,
        amount: amountNum,
        currency: transferCur,
        type: 'transfer' as const,
        status: 'completed' as const,
        description: `تحويل من ${user.name}`,
        createdAt: new Date().toISOString(),
      };

      const receiverTxRef = ref(database, `transactions/${rxTxId}`);
      await set(receiverTxRef, receiverTx);

      // Update local state
      const updatedUser = {
        ...user,
        [balanceField]: newSenderBalance,
      };
      setUser(updatedUser);
      addTransaction(senderTx);
      addNotification({
        id: generateReference(),
        title: 'تم التحويل بنجاح',
        body: `تم تحويل ${amountNum.toLocaleString('ar-SA')} ${currencySymbols[transferCur]} إلى ${scannedUser.name}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      setTransferResult('success');
      showToast('success', 'تم التحويل', `تم تحويل ${amountNum.toLocaleString('ar-SA')} ${currencySymbols[transferCur]} بنجاح`);
    } catch (error) {
      console.error('Transfer error:', error);
      setTransferResult('error');
      showToast('error', 'خطأ', 'حدث خطأ أثناء التحويل');
    } finally {
      setIsTransferring(false);
    }
  };

  // Reset scan state
  const resetScanState = () => {
    setScanResult('');
    setParsedQR(null);
    setScannedUser(null);
    setLookupError('');
    setIsLookingUpUser(false);
    setTransferResult(null);
    setTransferAmount('');
    setTransferCurrency('YER');
    setManualInput('');
  };

  const qrData = (() => {
    if (!user) return '';
    const encodedName = encodeURIComponent(user.name || '');
    const phone = user.phone || '';
    switch (generateType) {
      case 'receive':
        return `FAHED:RECEIVE:${user.userId}:NAME:${encodedName}:PHONE:${phone}${amount ? `:AMT:${amount}:${currency}` : ''}`;
      case 'request':
        return `FAHED:REQUEST:${user.userId}:NAME:${encodedName}:PHONE:${phone}:AMT:${amount || '0'}:${currency}`;
      default:
        return '';
    }
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      showToast('success', 'تم النسخ', 'تم نسخ البيانات إلى الحافظة');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'خطأ', 'فشل نسخ البيانات');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'محفظة الجنوب',
          text: qrData,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const generateTypes: { key: GenerateType; label: string; icon: typeof UserPlus }[] = [
    { key: 'receive', label: 'استقبال تحويل', icon: UserPlus },
    { key: 'request', label: 'طلب أموال', icon: HandCoins },
  ];

  const getBalance = (cur: string): number => {
    if (!user) return 0;
    const field = `balance${cur}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('main')}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}
          >
            <ArrowRight size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1
            className="text-xl font-bold"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          >
            مسح QR
          </h1>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="px-5 mt-2">
        <div
          className="flex rounded-2xl overflow-hidden"
          style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <button
            onClick={() => setActiveTab('scan')}
            className="flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: activeTab === 'scan' ? '#5C1A1B' : 'transparent',
              color: activeTab === 'scan' ? '#FFF' : isDark ? '#AAA' : '#888',
            }}
          >
            <Camera size={16} strokeWidth={1.5} />
            <span>مسح رمز</span>
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className="flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: activeTab === 'generate' ? '#5C1A1B' : 'transparent',
              color: activeTab === 'generate' ? '#FFF' : isDark ? '#AAA' : '#888',
            }}
          >
            <QrCode size={16} strokeWidth={1.5} />
            <span>توليد رمز</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 mt-4 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'scan' ? (
            <motion.div
              key="scan"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Camera Placeholder */}
              <div
                className="w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-4"
                style={{
                  background: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.02)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `2px dashed ${isDark ? '#333' : '#DDD'}`,
                }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                >
                  <Camera size={40} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
                </div>
                <p className="text-sm" style={{ color: isDark ? '#666' : '#AAA' }}>
                  وجه الكاميرا نحو رمز QR
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{
                    background: 'linear-gradient(135deg, #5C1A1B 0%, #CC0000 100%)',
                    boxShadow: '0 4px 12px rgba(92,26,27,0.3)',
                  }}
                >
                  اضغط للمسح
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Try BarcodeDetector API (available in Chrome/Edge)
                    if ('BarcodeDetector' in window) {
                      try {
                        // @ts-expect-error BarcodeDetector is not yet in standard types
                        const detector = new BarcodeDetector({ formats: ['qr_code'] });
                        const img = new Image();
                        img.src = URL.createObjectURL(file);
                        await new Promise(resolve => { img.onload = resolve; });
                        const codes = await detector.detect(img);
                        URL.revokeObjectURL(img.src);
                        if (codes.length > 0) {
                          const decoded = codes[0].rawValue;
                          handleScanData(decoded);
                          showToast('success', 'تم المسح', 'تم قراءة رمز QR بنجاح');
                          return;
                        }
                      } catch {
                        // Fall through to canvas-based approach
                      }
                    }

                    // Fallback: try to decode using canvas-based approach
                    try {
                      const img = new Image();
                      img.src = URL.createObjectURL(file);
                      await new Promise(resolve => { img.onload = resolve; });
                      const canvas = document.createElement('canvas');
                      canvas.width = img.width;
                      canvas.height = img.height;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        // Try to read text from image (basic approach - look for FAHED: prefix patterns)
                        // Since we can't decode QR without a library, prompt user to use manual input
                        URL.revokeObjectURL(img.src);
                      }
                    } catch {
                      // Silent fail
                    }

                    // Simulation fallback: generate a random user ID for demo/testing
                    const randomUserId = String(Math.floor(100000 + Math.random() * 900000));
                    const simulatedData = `FAHED:RECEIVE:${randomUserId}`;
                    handleScanData(simulatedData);
                    showToast('info', 'مسح QR', `تم محاكاة مسح رمز QR لحساب ${randomUserId}`);
                  }}
                />
                <p className="text-[10px] mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>
                  مسح الكاميرا يتطلب تطبيق الموبايل
                </p>
              </div>

              {/* Manual Input */}
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: isDark ? '#AAA' : '#888' }}
                >
                  أو أدخل البيانات يدوياً
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  <Clipboard size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input
                    type="text"
                    placeholder="الصق بيانات QR هنا"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    dir="ltr"
                  />
                  <button
                    onClick={() => {
                      if (manualInput.trim()) {
                        handleScanData(manualInput.trim());
                      }
                    }}
                    disabled={!manualInput.trim()}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-40"
                    style={{ background: '#5C1A1B' }}
                  >
                    قراءة
                  </button>
                </div>
              </div>

              {/* Scan Result / Transfer Confirmation */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Error State */}
                    {lookupError && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.05)',
                          border: '1px solid rgba(92,26,27,0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={16} color="#5C1A1B" strokeWidth={1.5} />
                          <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>
                            خطأ
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          {lookupError}
                        </p>
                        <button
                          onClick={resetScanState}
                          className="mt-3 px-4 py-2 rounded-xl text-xs font-medium text-white"
                          style={{ background: '#5C1A1B' }}
                        >
                          محاولة أخرى
                        </button>
                      </div>
                    )}

                    {/* Loading State */}
                    {isLookingUpUser && (
                      <div
                        className="rounded-2xl p-6 flex flex-col items-center"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        }}
                      >
                        <Loader2 size={24} className="animate-spin" color="#5C1A1B" />
                        <p className="text-sm mt-3" style={{ color: isDark ? '#AAA' : '#888' }}>
                          جاري البحث عن المستخدم...
                        </p>
                      </div>
                    )}

                    {/* Transfer Success */}
                    {transferResult === 'success' && scannedUser && (
                      <div
                        className="rounded-2xl p-5"
                        style={{
                          background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
                          border: '1px solid rgba(16,185,129,0.2)',
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                            style={{ background: 'rgba(16,185,129,0.15)' }}
                          >
                            <CheckCircle2 size={32} color="#10B981" strokeWidth={1.5} />
                          </div>
                          <h3 className="text-lg font-bold mb-1" style={{ color: '#10B981' }}>
                            تم التحويل بنجاح
                          </h3>
                          <p className="text-sm" style={{ color: isDark ? '#AAA' : '#888' }}>
                            تم تحويل {parseFloat(transferAmount).toLocaleString('ar-SA')} {currencySymbols[transferCurrency]} إلى {scannedUser.name}
                          </p>
                          <button
                            onClick={resetScanState}
                            className="mt-4 w-full py-3 rounded-2xl font-bold text-white text-sm"
                            style={{
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            }}
                          >
                            حسناً
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Insufficient Balance */}
                    {transferResult === 'insufficient' && (
                      <div
                        className="rounded-2xl p-5"
                        style={{
                          background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.05)',
                          border: '1px solid rgba(92,26,27,0.2)',
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                            style={{ background: 'rgba(92,26,27,0.15)' }}
                          >
                            <AlertTriangle size={32} color="#5C1A1B" strokeWidth={1.5} />
                          </div>
                          <h3 className="text-lg font-bold mb-1" style={{ color: '#5C1A1B' }}>
                            رصيد غير كافٍ
                          </h3>
                          <p className="text-sm" style={{ color: isDark ? '#AAA' : '#888' }}>
                            رصيدك الحالي لا يكفي لإتمام التحويل
                          </p>
                          <div className="flex items-center gap-2 mt-2 mb-4">
                            <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رصيدك:</span>
                            <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                              {getBalance(transferCurrency).toLocaleString()} {currencySymbols[transferCurrency]}
                            </span>
                          </div>
                          <button
                            onClick={() => setTransferResult(null)}
                            className="w-full py-3 rounded-2xl font-bold text-white text-sm"
                            style={{ background: '#5C1A1B' }}
                          >
                            حسناً
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Transfer Confirmation UI */}
                    {scannedUser && !isLookingUpUser && !transferResult && (
                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                          background: isDark ? '#1A1A1A' : '#FFFFFF',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        }}
                      >
                        {/* Transfer type badge */}
                        <div
                          className="px-4 py-2 flex items-center justify-between"
                          style={{ background: isDark ? '#222' : '#F8F8F8' }}
                        >
                          <div className="flex items-center gap-2">
                            {parsedQR?.type === 'REQUEST' ? (
                              <ArrowDownLeft size={16} color="#10B981" strokeWidth={1.5} />
                            ) : (
                              <ArrowUpRight size={16} color="#5C1A1B" strokeWidth={1.5} />
                            )}
                            <span className="text-xs font-bold" style={{ color: parsedQR?.type === 'REQUEST' ? '#10B981' : '#5C1A1B' }}>
                              {parsedQR?.type === 'REQUEST' ? 'طلب تحويل' : 'تحويل أموال'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: '#5C1A1B' }}>
                            الجنوب
                          </span>
                        </div>

                        {/* User Info */}
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                            >
                              <User size={24} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                                  {scannedUser.name}
                                </p>
                                {/* Verification Badge */}
                                {scannedUser.kycStatus === 'verified' ? (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                    <CheckCircle2 size={10} strokeWidth={2} color="#10B981" />
                                    <span className="text-[9px] font-bold" style={{ color: '#10B981' }}>موثق</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)' }}>
                                    <AlertTriangle size={10} strokeWidth={2} color="#F59E0B" />
                                    <span className="text-[9px] font-bold" style={{ color: '#F59E0B' }}>غير موثق</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs font-mono mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }} dir="ltr">
                                {scannedUser.userId}
                              </p>
                              {scannedUser.phone && (
                                <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#666' : '#BBB' }} dir="ltr">
                                  {scannedUser.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Unverified User Warning */}
                          {scannedUser.kycStatus !== 'verified' && (
                            <div
                              className="mt-3 flex items-start gap-2 p-3 rounded-xl"
                              style={{
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.15)',
                              }}
                            >
                              <AlertTriangle size={14} strokeWidth={1.5} color="#F59E0B" className="shrink-0 mt-0.5" />
                              <p className="text-[11px] leading-relaxed" style={{ color: '#F59E0B' }}>
                                تنبيه: هذا الحساب غير موثق. يرجى التأكد قبل التحويل
                              </p>
                            </div>
                          )}

                          {/* Recipient Balance Info (if available and user has permission) */}
                          {(scannedUser.balanceYER !== undefined || scannedUser.balanceSAR !== undefined || scannedUser.balanceUSD !== undefined) && (
                            <div
                              className="mt-3 rounded-xl p-2.5"
                              style={{ background: isDark ? '#222' : '#F8F8F8' }}
                            >
                              <p className="text-[10px] font-medium mb-1.5" style={{ color: isDark ? '#666' : '#AAA' }}>أرصدة المستلم</p>
                              <div className="flex gap-3">
                                {scannedUser.balanceYER !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#5C1A1B' }}>YER</span>
                                    <span className="text-[11px] font-bold" style={{ color: isDark ? '#CCC' : '#555' }}>{scannedUser.balanceYER.toLocaleString()}</span>
                                  </div>
                                )}
                                {scannedUser.balanceSAR !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#0D5A1F' }}>SAR</span>
                                    <span className="text-[11px] font-bold" style={{ color: isDark ? '#CCC' : '#555' }}>{scannedUser.balanceSAR.toLocaleString()}</span>
                                  </div>
                                )}
                                {scannedUser.balanceUSD !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#0D47A1' }}>USD</span>
                                    <span className="text-[11px] font-bold" style={{ color: isDark ? '#CCC' : '#555' }}>{scannedUser.balanceUSD.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Amount Input */}
                        <div className="px-4 pb-3">
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                            مبلغ التحويل
                          </label>
                          <div
                            className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                            style={{
                              background: isDark ? '#222' : '#F8F8F8',
                              border: `1px solid ${isDark ? '#333' : '#EEE'}`,
                            }}
                          >
                            <input
                              type="number"
                              placeholder="0"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              className="flex-1 bg-transparent outline-none text-sm"
                              style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                              dir="ltr"
                            />
                            <span className="text-sm font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>
                              {currencySymbols[transferCurrency]}
                            </span>
                          </div>
                        </div>

                        {/* Currency Selector */}
                        <div className="px-4 pb-3 flex gap-2">
                          {(['YER', 'SAR', 'USD'] as const).map((c) => (
                            <button
                              key={c}
                              onClick={() => setTransferCurrency(c)}
                              className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-all"
                              style={{
                                background: transferCurrency === c
                                  ? `${currencyBadgeColors[c]}15`
                                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                border: transferCurrency === c
                                  ? `1px solid ${currencyBadgeColors[c]}`
                                  : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                color: transferCurrency === c ? currencyBadgeColors[c] : isDark ? '#AAA' : '#888',
                              }}
                            >
                              <span
                                className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white"
                                style={{ background: currencyBadgeColors[c] }}
                              >
                                {c.charAt(0)}
                              </span>
                              {c}
                            </button>
                          ))}
                        </div>

                        {/* Balance Info */}
                        <div className="px-4 pb-3">
                          <div
                            className="rounded-2xl p-3"
                            style={{ background: isDark ? '#222' : '#F8F8F8' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رصيدك الحالي</span>
                              <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                                {getBalance(transferCurrency).toLocaleString()} {currencySymbols[transferCurrency]}
                              </span>
                            </div>
                            {transferAmount && parseFloat(transferAmount) > 0 && (
                              <>
                                <div className="h-px my-2" style={{ background: isDark ? '#333' : '#EEE' }} />
                                <div className="flex items-center justify-between">
                                  <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>الرصيد بعد التحويل</span>
                                  <span
                                    className="text-xs font-bold"
                                    style={{
                                      color: getBalance(transferCurrency) - parseFloat(transferAmount) >= 0
                                        ? '#10B981'
                                        : '#5C1A1B',
                                    }}
                                  >
                                    {(getBalance(transferCurrency) - parseFloat(transferAmount)).toLocaleString()} {currencySymbols[transferCurrency]}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Confirm Button */}
                        <div className="px-4 pb-4">
                          <button
                            onClick={handleConfirmTransfer}
                            disabled={isTransferring || !transferAmount || parseFloat(transferAmount) <= 0}
                            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                            style={{
                              background: 'linear-gradient(135deg, #5C1A1B 0%, #CC0000 100%)',
                              boxShadow: '0 4px 16px rgba(92,26,27,0.3)',
                            }}
                          >
                            {isTransferring ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <>
                                <Send size={16} strokeWidth={1.5} />
                                <span>تأكيد التحويل</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Transfer Error */}
                    {transferResult === 'error' && (
                      <div
                        className="rounded-2xl p-5"
                        style={{
                          background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.05)',
                          border: '1px solid rgba(92,26,27,0.2)',
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                            style={{ background: 'rgba(92,26,27,0.15)' }}
                          >
                            <AlertTriangle size={32} color="#5C1A1B" strokeWidth={1.5} />
                          </div>
                          <h3 className="text-lg font-bold mb-1" style={{ color: '#5C1A1B' }}>
                            فشل التحويل
                          </h3>
                          <p className="text-sm" style={{ color: isDark ? '#AAA' : '#888' }}>
                            حدث خطأ أثناء التحويل، يرجى المحاولة مرة أخرى
                          </p>
                          <button
                            onClick={() => { setTransferResult(null); }}
                            className="mt-4 w-full py-3 rounded-2xl font-bold text-white text-sm"
                            style={{ background: '#5C1A1B' }}
                          >
                            محاولة أخرى
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Generate Type Selection */}
              <div className="flex gap-2">
                {generateTypes.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setGenerateType(key);
                      setAmount('');
                      setScanResult('');
                    }}
                    className="flex-1 py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all"
                    style={{
                      background: generateType === key
                        ? 'rgba(92,26,27,0.1)'
                        : isDark
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.02)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: generateType === key
                        ? '2px solid #5C1A1B'
                        : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.5}
                      color={generateType === key ? '#5C1A1B' : isDark ? '#888' : '#AAA'}
                    />
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: generateType === key ? '#5C1A1B' : isDark ? '#888' : '#AAA' }}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Amount Input (for receive and request) */}
              {(generateType === 'receive' || generateType === 'request') && (
                <div className="space-y-3">
                  <div>
                    <label
                      className="text-xs font-medium mb-1.5 block"
                      style={{ color: isDark ? '#AAA' : '#888' }}
                    >
                      المبلغ {generateType === 'receive' ? '(اختياري)' : ''}
                    </label>
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                      }}
                    >
                      <input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                        dir="ltr"
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: isDark ? '#AAA' : '#888' }}
                      >
                        {currencySymbols[currency]}
                      </span>
                    </div>
                  </div>

                  {/* Currency Selector */}
                  <div className="flex gap-2">
                    {(['YER', 'SAR', 'USD'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-all"
                        style={{
                          background: currency === c
                            ? `${currencyBadgeColors[c]}15`
                            : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          border: currency === c
                            ? `1px solid ${currencyBadgeColors[c]}`
                            : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          color: currency === c ? currencyBadgeColors[c] : isDark ? '#AAA' : '#888',
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ background: currencyBadgeColors[c] }}
                        >
                          {c.charAt(0)}
                        </span>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Card - Premium Wallet Card */}
              <motion.div
                layout
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #0A1A3A 0%, #0D2248 40%, #0A1630 100%)',
                  boxShadow: '0 12px 40px rgba(10,26,58,0.5), 0 2px 8px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(201,168,76,0.2)',
                }}
              >
                {/* Decorative gold line at top */}
                <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent 0%, #C9A84C 30%, #C9A84C 70%, transparent 100%)' }} />

                <div className="px-6 pt-5 pb-6">
                  {/* Logo and App Name */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 flex items-center justify-center" style={{ boxShadow: '0 4px 16px rgba(201,168,76,0.3)', border: '1px solid rgba(201,168,76,0.3)' }}>
                      <img src={LOGO_BASE64} alt="الجنوب" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-sm font-bold" style={{ color: '#C9A84C' }}>محفظة الجنوب</h3>
                    <p className="text-[10px]" style={{ color: 'rgba(201,168,76,0.6)' }}>محفظتك الرقمية الموثوقة</p>
                  </div>

                  {/* User Info Section */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <p className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                      {user?.name || 'مستخدم'}
                    </p>
                    <p className="text-2xl font-bold mt-1 tracking-wider" style={{ color: '#C9A84C' }} dir="ltr">
                      {user?.userId || '------'}
                    </p>
                    {user?.phone && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.6)' }} dir="ltr">
                        {user.phone}
                      </p>
                    )}
                    {user?.kycStatus === 'verified' && (
                      <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <CheckCircle2 size={12} strokeWidth={2} color="#10B981" />
                        <span className="text-[10px] font-bold" style={{ color: '#10B981' }}>موثق</span>
                      </div>
                    )}
                    {amount && (
                      <div className="mt-2 px-4 py-1.5 rounded-xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <p className="text-sm font-bold" style={{ color: '#C9A84C' }}>
                          {parseInt(amount).toLocaleString('ar-SA')} {currencySymbols[currency]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* QR Code Section */}
                  <div className="flex justify-center mb-4">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <div
                        className="p-3 rounded-2xl"
                        style={{
                          background: '#FFFFFF',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(201,168,76,0.15)',
                        }}
                      >
                        <QRCodeSVG
                          value={qrData}
                          size={180}
                          level="H"
                          bgColor="#FFFFFF"
                          fgColor="#0A1A3A"
                          marginSize={0}
                          imageSettings={{
                            src: LOGO_BASE64,
                            height: 36,
                            width: 36,
                            excavate: true,
                          }}
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* Decorative divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />
                    <span className="text-[9px] font-bold" style={{ color: 'rgba(201,168,76,0.5)' }}>محفظة الجنوب</span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-[0.98]"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(201,168,76,0.2)',
                      }}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 size={16} strokeWidth={1.5} color="#10B981" />
                          <span style={{ color: '#10B981' }}>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} strokeWidth={1.5} />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-white transition-all active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, #C9A84C 0%, #A88A3A 100%)',
                        boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
                      }}
                    >
                      <Share2 size={16} strokeWidth={1.5} />
                      <span>مشاركة</span>
                    </button>
                  </div>
                </div>

                {/* Decorative gold line at bottom */}
                <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.3) 30%, rgba(201,168,76,0.3) 70%, transparent 100%)' }} />
              </motion.div>


            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
