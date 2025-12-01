import React, { useRef, useState, useCallback } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  React.useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const image = canvasRef.current.toDataURL('image/jpeg');
        onCapture(image);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Scan Silica Gel</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="text-slate-500" />
          </button>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
          {error ? (
            <div className="flex h-full items-center justify-center text-center text-white p-4">
              <p>{error}</p>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="h-full w-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="mt-6 flex justify-center gap-4">
           {error ? (
              <button 
                onClick={startCamera}
                className="flex items-center gap-2 rounded-full bg-slate-800 px-6 py-3 font-semibold text-white active:scale-95"
              >
                <RefreshCw size={20} /> Retry
              </button>
           ) : (
              <button 
                onClick={handleCapture}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Camera size={24} /> Capture Status
              </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
