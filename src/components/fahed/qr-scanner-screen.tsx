'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Camera, X, AlertCircle, CheckCircle, SwitchCamera, Copy, Check } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/components/fahed/toast-provider';

export function QrScannerScreen() {
  const { setActiveScreen } = useAppStore();
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [copied, setCopied] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Stop scanning helper
  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      try {
        scannerRef.current.clear();
      } catch (e) {
        // Ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // Start camera scanning
  const startScanning = useCallback(async () => {
    setError(null);
    try {
      if (scannerRef.current) {
        await stopScanning();
      }

      const html5QrCode = new Html5Qrcode('qr-scanner-reader');
      scannerRef.current = html5QrCode;

      const facingMode = useFrontCamera ? 'user' : 'environment';
      await html5QrCode.start(
        { facingMode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScanning();
          setScannedResult(decodedText);
          showToast('success', 'تم المسح', 'تم قراءة رمز QR بنجاح');
        },
        () => {
          // Scan failure - ignore, tries again automatically
        }
      );
      setScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      scannerRef.current = null;
      setScanning(false);
      setError('لا يمكن الوصول إلى الكاميرا. تأكد من منح الإذن.');
      showToast('error', 'خطأ', 'لا يمكن الوصول إلى الكاميرا');
    }
  }, [stopScanning, showToast, useFrontCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            }).catch(() => {});
          } else {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // Handle manual input submit
  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      showToast('error', 'خطأ', 'يرجى إدخال بيانات صالحة');
      return;
    }
    setScannedResult(manualInput.trim());
    stopScanning();
  };

  // Handle result action - copy to clipboard
  const handleUseResult = async () => {
    if (scannedResult) {
      try {
        await navigator.clipboard.writeText(scannedResult);
        setCopied(true);
        showToast('success', 'تم النسخ', 'تم نسخ البيانات إلى الحافظة');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showToast('error', 'خطأ', 'فشل نسخ البيانات');
      }
    }
  };

  const handleReset = () => {
    setScannedResult(null);
    setManualInput('');
    setError(null);
  };

  // Toggle camera
  const handleFlipCamera = async () => {
    await stopScanning();
    setUseFrontCamera(prev => !prev);
    setTimeout(() => startScanning(), 300);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy-gradient px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { stopScanning(); setActiveScreen('main'); }} className="p-2 glass rounded-xl">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-white text-lg font-bold">مسح QR</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        {scannedResult ? (
          /* Result View */
          <div className="glass-card rounded-2xl p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">تم المسح بنجاح</h3>
            <div className="bg-muted rounded-xl p-3 mb-4">
              <p className="text-xs font-mono break-all" dir="ltr">{scannedResult}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUseResult}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={14} strokeWidth={2} />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={1.5} />
                    نسخ البيانات
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold"
              >
                مسح مرة أخرى
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Camera View */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative aspect-square bg-black">
                {/* QR Reader container */}
                <div
                  id="qr-scanner-reader"
                  className="absolute inset-0 w-full h-full"
                  style={{ display: scanning ? 'block' : 'none' }}
                />

                {!scanning && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                    <Camera className="h-16 w-16 text-white/50 mb-4" />
                    <p className="text-white/70 text-sm mb-4">اضغط لبدء المسح</p>
                    <button
                      onClick={startScanning}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
                    >
                      بدء المسح
                    </button>
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                    <p className="text-white/80 text-sm text-center mb-4">{error}</p>
                    <button
                      onClick={startScanning}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                )}
                {scanning && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-3 z-10">
                    <button
                      onClick={handleFlipCamera}
                      className="p-2.5 rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#FFF' }}
                      title={useFrontCamera ? 'الكاميرا الخلفية' : 'الكاميرا الأمامية'}
                    >
                      <SwitchCamera size={18} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={stopScanning}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#FFF' }}
                    >
                      <X size={16} strokeWidth={1.5} />
                      إيقاف المسح
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Input */}
            <div className="mt-4 glass-card rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-3">أو أدخل البيانات يدوياً</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أدخل بيانات QR..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-muted rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/30"
                  dir="ltr"
                />
                <button
                  onClick={handleManualSubmit}
                  className="px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
                >
                  تأكيد
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
