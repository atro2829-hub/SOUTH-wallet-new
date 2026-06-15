'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Camera, X, Scan, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

export function QrScannerScreen() {
  const { navigateBack, pushScreen, setActiveScreen } = useStore();
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('لا يمكن الوصول إلى الكاميرا. تأكد من منح الإذن.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle manual input submit
  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      toast.error('يرجى إدخال عنوان صالح');
      return;
    }
    setScannedResult(manualInput.trim());
    stopCamera();
  };

  // Handle result action
  const handleUseResult = () => {
    if (scannedResult) {
      // Could navigate to transfer with the address pre-filled
      toast.success('تم نسخ العنوان');
      navigator.clipboard.writeText(scannedResult).catch(() => {});
    }
  };

  const handleReset = () => {
    setScannedResult(null);
    setManualInput('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy-gradient px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { stopCamera(); navigateBack(); }} className="p-2 glass rounded-xl">
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
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
              >
                استخدام العنوان
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
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {!scanning && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                    <Camera className="h-16 w-16 text-white/50 mb-4" />
                    <p className="text-white/70 text-sm mb-4">اضغط لبدء المسح</p>
                    <button
                      onClick={startCamera}
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
                      onClick={startCamera}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                )}
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Scanning overlay */}
                    <div className="absolute inset-8 border-2 border-white/30 rounded-2xl">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                      {/* Animated scan line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-primary animate-bounce top-1/2" />
                    </div>
                  </div>
                )}
                {scanning && (
                  <button
                    onClick={stopCamera}
                    className="absolute top-4 left-4 p-2 bg-black/50 rounded-full"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                )}
              </div>
              {/* Hidden canvas for frame processing */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Manual Input */}
            <div className="mt-4 glass-card rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-3">أو أدخل العنوان يدوياً</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أدخل عنوان المحفظة..."
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
