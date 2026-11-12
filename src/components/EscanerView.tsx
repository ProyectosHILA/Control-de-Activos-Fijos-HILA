import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScanLine,
  Camera,
  CameraOff,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  QrCode,
  Upload,
  SwitchCamera,
  AlertTriangle,
  Volume2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Activo } from '../types';
import { formatCOP } from '../utils/formatters';

interface EscanerViewProps {
  activos: Activo[];
  onSelectActivo: (activo: Activo) => void;
}

export const EscanerView: React.FC<EscanerViewProps> = ({ activos, onSelectActivo }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [foundActivo, setFoundActivo] = useState<Activo | null>(null);
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanAnimation, setScanAnimation] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);

  // Gemini AI Scanner states
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [aiDetectedLabel, setAiDetectedLabel] = useState<string | null>(null);
  const [autoAiScan, setAutoAiScan] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play audio beep on successful detection
  const playBeep = useCallback(() => {
    if (!audioFeedback) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {}
  }, [audioFeedback]);

  // Enumerate video cameras
  const listCameras = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          // Prefer environment/back camera if labeled
          const backCam = videoInputs.find(
            (d) => /back|rear|traser|environment/i.test(d.label)
          );
          setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
        }
      }
    } catch (e) {
      console.warn('Error enumerating camera devices:', e);
    }
  };

  useEffect(() => {
    listCameras();
  }, []);

  // Search by code in activos list
  const handleSearchCode = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;

    setScanAnimation(true);
    setTimeout(() => setScanAnimation(false), 600);

    // Normalize for search
    const cleanQ = q.toLowerCase().replace(/['" ]/g, '');

    const match = activos.find((a) => {
      const c = String(a.codigo || '').toLowerCase().replace(/['" ]/g, '');
      const p = String(a.placa || a.pol || '').toLowerCase().replace(/['" ]/g, '');
      const s = String(a.serie || a.man || '').toLowerCase().replace(/['" ]/g, '');
      return c === cleanQ || p === cleanQ || s === cleanQ || c.includes(cleanQ) || (cleanQ.length > 3 && c.endsWith(cleanQ));
    });

    if (match) {
      setFoundActivo(match);
      setNotFoundQuery(null);
      playBeep();
    } else {
      setFoundActivo(null);
      setNotFoundQuery(q);
    }
  }, [activos, playBeep]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsScanning(false);
  }, []);

  // Optical detection loop using native BarcodeDetector or fallback canvas analysis
  const startScanningLoop = useCallback(() => {
    if (!('BarcodeDetector' in window)) {
      // BarcodeDetector not supported in this browser; camera is displayed for manual visual inspection
      return;
    }

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: [
          'code_128',
          'code_39',
          'ean_13',
          'ean_8',
          'qr_code',
          'upc_a',
          'upc_e',
          'data_matrix'
        ],
      });

      let lastScannedTime = 0;

      const scanFrame = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        const now = Date.now();
        // Scan every 200ms
        if (now - lastScannedTime > 200) {
          lastScannedTime = now;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detectedValue = barcodes[0].rawValue;
              if (detectedValue) {
                setManualCode(detectedValue);
                handleSearchCode(detectedValue);
              }
            }
          } catch {}
        }

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      };

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (e) {
      console.warn('BarcodeDetector error:', e);
    }
  }, [handleSearchCode]);

  // Start Camera
  const startCamera = async (deviceIdToUse?: string) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara (getUserMedia) no está disponible en este navegador o entorno.');
      }

      let constraints: MediaStreamConstraints;

      if (deviceIdToUse) {
        constraints = {
          video: {
            deviceId: { exact: deviceIdToUse },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      } else {
        constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      }

      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Ideal constraint failed, retrying with simple video=true:', firstErr);
        // Fallback: simple constraint for desktop webcams or restricted devices
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setCameraActive(true);
      setIsScanning(true);

      // Re-list devices after permission is granted so device labels appear
      listCameras();

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        startScanningLoop();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'No se pudo activar la cámara.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permiso denegado: El navegador bloqueó el acceso a la cámara. Por favor autoriza los permisos de cámara en la barra del navegador o usa el botón de subir foto.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No se encontró ninguna cámara conectada en este dispositivo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.';
      } else {
        msg = err.message || msg;
      }
      setCameraError(msg);
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  // Switch camera device
  const handleSwitchCamera = () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    if (cameraActive) {
      startCamera(nextDevice.deviceId);
    }
  };

  // AI Multimodal OCR: Captures snapshot from video and calls Gemini 3.8 Flash to read barcodes and numbers
  const captureAndScanWithAI = useCallback(
    async (customImageBase64?: string) => {
      if (isAnalyzingAI) return;

      let imageToSend = customImageBase64;

      if (!imageToSend) {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          setCameraError('Espera un segundo a que la cámara termine de inicializarse.');
          return;
        }

        try {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageToSend = canvas.toDataURL('image/jpeg', 0.85);
        } catch (e: any) {
          console.error('Error capturing canvas frame:', e);
          return;
        }
      }

      if (!imageToSend) return;

      setIsAnalyzingAI(true);
      setAiDetectedLabel('Analizando imagen y leyendo números con IA...');

      try {
        const response = await fetch('/api/scan-barcode-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: imageToSend }),
        });

        if (!response.ok) {
          throw new Error(`Error en el servidor (${response.status})`);
        }

        const data = await response.json();
        const detectedCode = (data.code || '').trim();

        if (detectedCode) {
          setAiDetectedLabel(`Código detectado por IA: ${detectedCode}`);
          setManualCode(detectedCode);
          handleSearchCode(detectedCode);
        } else {
          setAiDetectedLabel('No se distinguieron números de código de barras. Acerca la etiqueta al centro e intenta de nuevo.');
        }
      } catch (err: any) {
        console.error('Error scanning with AI:', err);
        setAiDetectedLabel('Error al consultar el lector de IA: ' + (err.message || 'Desconocido'));
      } finally {
        setIsAnalyzingAI(false);
      }
    },
    [isAnalyzingAI, handleSearchCode]
  );

  // Periodic automatic AI scan when autoAiScan is enabled
  useEffect(() => {
    if (!autoAiScan || !cameraActive) return;

    const interval = setInterval(() => {
      if (!isAnalyzingAI && videoRef.current && videoRef.current.readyState >= 2) {
        captureAndScanWithAI();
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [autoAiScan, cameraActive, isAnalyzingAI, captureAndScanWithAI]);

  // Scan from photo / image upload with AI OCR
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      // 1. First attempt native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a'],
          });
          const img = new Image();
          img.src = base64;
          img.onload = async () => {
            try {
              const barcodes = await barcodeDetector.detect(img);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                const val = barcodes[0].rawValue;
                setManualCode(val);
                handleSearchCode(val);
                setAiDetectedLabel(`Código detectado por sensor óptico: ${val}`);
                return;
              }
            } catch {}
            // If native barcode detector didn't find anything, run Gemini AI
            captureAndScanWithAI(base64);
          };
          return;
        } catch {}
      }

      // 2. Direct AI Multimodal inspection (reads barcode and human-readable numbers beneath)
      captureAndScanWithAI(base64);
    };
    reader.readAsDataURL(file);

    // Clear input
    e.target.value = '';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-blue-600" />
          Escáner Óptico de Activos Hospitalarios
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Escanea etiquetas con la cámara en tiempo real, sube una foto o busca por código de barras
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewfinder */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                Lector de Cámara
              </span>

              <div className="flex items-center gap-2">
                {availableDevices.length > 1 && (
                  <button
                    onClick={handleSwitchCamera}
                    className="p-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Cambiar Cámara"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                )}

                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Detener</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Activar Cámara</span>
                  </button>
                )}
              </div>
            </div>

            {/* Viewfinder display */}
            <div className="relative aspect-4/3 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
              {/* Always mount video element so stream can attach reliably */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100' : 'opacity-0 absolute'
                }`}
              />

              {cameraActive ? (
                <>
                  {/* Targeting frame overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-60 h-36 border-2 border-blue-400/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      {/* Corner marks */}
                      <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-md" />
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-md" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-md" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-md" />

                      {/* Laser red scan line */}
                      <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                  </div>

                  {/* AI processing overlay */}
                  {isAnalyzingAI && (
                    <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 space-y-2 z-20 animate-in fade-in">
                      <div className="w-12 h-12 rounded-full bg-blue-600/80 flex items-center justify-center shadow-lg animate-pulse">
                        <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
                      </div>
                      <span className="text-xs font-bold tracking-wide">
                        IA Leyendo Código y Números...
                      </span>
                      <span className="text-[10px] text-blue-200 text-center max-w-[200px]">
                        Extrayendo números impresos debajo del código de barras
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 text-center pointer-events-none">
                    <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-full font-medium">
                      Apunta la cámara al código de barras o números de placa
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">Cámara Inactiva</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                    Presiona "Activar Cámara" para iniciar la lectura óptica o usa el lector con IA
                  </p>
                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="mt-3.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Iniciar Cámara</span>
                  </button>
                </div>
              )}
            </div>

            {/* AI Action Trigger Bar */}
            {cameraActive && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isAnalyzingAI}
                  onClick={() => captureAndScanWithAI()}
                  className="py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Escanear con IA (Leer Números)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAutoAiScan(!autoAiScan)}
                  className={`py-2 px-3 border rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    autoAiScan
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Captura automática periódica con IA"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${autoAiScan ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                  <span>Auto-Escaneo IA: {autoAiScan ? 'Activado' : 'Manual'}</span>
                </button>
              </div>
            )}

            {/* AI Detected Label or Feedback Banner */}
            {aiDetectedLabel && (
              <div className="mt-2.5 p-2.5 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-lg text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium">{aiDetectedLabel}</span>
                </div>
                <button
                  onClick={() => setAiDetectedLabel(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error / Alert notice if any */}
            {cameraError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Aviso de Cámara</span>
                  <span>{cameraError}</span>
                  <div className="mt-1.5 flex gap-2">
                    <button
                      onClick={() => startCamera(selectedDeviceId)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer"
                    >
                      Reintentar
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Subir Foto de Código
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Photo / Image scanner option */}
            <div className="mt-3.5 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Escanear Foto / Archivo con IA</span>
              </button>

              <button
                type="button"
                onClick={() => setAudioFeedback(!audioFeedback)}
                className={`p-2 border rounded-lg transition-colors cursor-pointer ${
                  audioFeedback
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
                title={audioFeedback ? 'Sonido activado' : 'Sonido silenciado'}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Manual Code Input Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Búsqueda Rápida por Código
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchCode(manualCode);
                      }
                    }}
                    placeholder="Ejemplo: 000321 o 011753..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {manualCode && (
                    <button
                      onClick={() => setManualCode('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleSearchCode(manualCode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </button>
              </div>
            </div>

            {/* Quick Demo Scanning Buttons */}
            {activos.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="block text-[11px] text-slate-400 mb-2">
                  Códigos de prueba en tu base de datos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activos.slice(0, 6).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setManualCode(a.codigo);
                        handleSearchCode(a.codigo);
                      }}
                      className="px-2.5 py-1 font-mono text-[11px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                    >
                      {a.codigo}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scan Result Card */}
        <div className="md:col-span-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Ficha del Activo Escaneado
              </span>
              {foundActivo && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Encontrado</span>
                </span>
              )}
            </div>

            {foundActivo ? (
              <div
                className={`flex-1 flex flex-col justify-between space-y-4 ${
                  scanAnimation ? 'animate-pulse' : 'animate-in fade-in'
                }`}
              >
                {/* Result Header */}
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                      CÓDIGO: {foundActivo.codigo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        foundActivo.estado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {foundActivo.estado}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {foundActivo.descripcion}
                  </h3>
                  <div className="text-xs text-slate-600 flex flex-wrap gap-2 pt-1 border-t border-blue-200/50">
                    <span>
                      <strong>Marca:</strong> {foundActivo.marca || 'Sin Marca'}
                    </span>
                    <span>&middot;</span>
                    <span>
                      <strong>Grupo:</strong> {foundActivo.grupo}
                    </span>
                    {foundActivo.placa && (
                      <>
                        <span>&middot;</span>
                        <span>
                          <strong>Placa:</strong> {foundActivo.placa}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Technical specs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Centro de Costos
                    </span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5">
                      {foundActivo.centro_costos || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Ubicación
                    </span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5">
                      {foundActivo.ubicacion || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Funcionario Custodio
                    </span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5">
                      {foundActivo.funcionario || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Fecha Compra
                    </span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5">
                      {foundActivo.fecha_compra || '—'}
                    </span>
                  </div>
                </div>

                {/* Financial values */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-200/60">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Valor Histórico:</span>
                    <span className="font-bold text-slate-900">
                      {formatCOP(foundActivo.valor_historico)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-rose-600">
                    <span>Depreciación Acumulada:</span>
                    <span className="font-semibold">
                      {formatCOP(foundActivo.depreciacion_acumulada)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-700 pt-1 border-t border-slate-200">
                    <span className="font-bold">Saldo por Depreciar:</span>
                    <span className="font-bold text-sm">
                      {formatCOP(foundActivo.saldo_por_depreciar)}
                    </span>
                  </div>
                </div>

                {/* Bottom Action */}
                <button
                  onClick={() => onSelectActivo(foundActivo)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Ficha Técnica Completa y Editar</span>
                </button>
              </div>
            ) : notFoundQuery ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Activo no Encontrado
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    El código <strong className="font-mono text-slate-700">"{notFoundQuery}"</strong> no coincide con ningún activo en la base de datos visible.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <ScanLine className="w-10 h-10 opacity-30 stroke-1" />
                <p className="text-xs font-medium text-slate-500">
                  Esperando lectura de código...
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Apunta la cámara a la placa del activo o ingresa el código numérico a la izquierda.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
