import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';

interface WebcamModalProps {
  onCapture: (photoDataUrl: string) => void;
  onClose: () => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 } })
      .then((s) => {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        setCameraError('Camera access unavailable or blocked in this browser context.');
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <div id="webcam-modal" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5 font-bold text-base text-slate-100">
            <Camera className="w-5 h-5 text-blue-400" />
            <span>Candidate Live Photo Capture</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {cameraError ? (
          <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-2.5 backdrop-blur-xs">
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="text-xs text-amber-300">{cameraError}</p>
            <p className="text-[11px] text-slate-400">Please choose a photo file using the upload option instead.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="aspect-video bg-black/90 rounded-xl overflow-hidden relative border border-white/10 flex items-center justify-center shadow-inner">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              {capturedImage ? (
                <>
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Use This Photo</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={takeSnapshot}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
