import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Upload, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export const CameraCapture = ({ onCapture, disabled }: CameraCaptureProps) => {
  const isMobile = useIsMobile();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraOpen(true);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setCameraError("Camera access denied. Please allow camera permissions.");
        } else if (err.name === "NotFoundError") {
          setCameraError("No camera found on this device.");
        } else {
          setCameraError("Could not access camera. Try uploading an image instead.");
        }
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob and create file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, stopCamera]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      e.target.value = "";
    }
  };

  const handleCameraClick = () => {
    if (isMobile) {
      // On mobile, use native camera input
      cameraInputRef.current?.click();
    } else {
      // On desktop, open WebRTC camera
      startCamera();
    }
  };

  // Camera preview mode
  if (isCameraOpen) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
            onLoadedMetadata={() => {
              videoRef.current?.play();
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={stopCamera}
            className="absolute right-2 top-2 bg-black/50 text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-4">
          <Button
            size="lg"
            onClick={capturePhoto}
            disabled={disabled}
            className="h-16 w-16 rounded-full shadow-lg"
          >
            <Camera className="h-8 w-8" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              stopCamera();
              startCamera();
            }}
            className="h-12 w-12 rounded-full"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Tap the camera button to capture</p>
      </div>
    );
  }

  // Default view
  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Camera error message */}
      {cameraError && (
        <div className="mb-2 rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {cameraError}
        </div>
      )}

      {/* Camera capture - primary action */}
      <Button
        size="lg"
        onClick={handleCameraClick}
        disabled={disabled}
        className="h-24 w-24 rounded-full shadow-lg"
      >
        <Camera className="h-10 w-10" />
      </Button>
      <p className="text-sm text-muted-foreground">
        {isMobile ? "Tap to take a photo" : "Tap to open camera"}
      </p>

      {/* Upload from gallery - secondary action */}
      <Button
        variant="outline"
        onClick={() => uploadInputRef.current?.click()}
        disabled={disabled}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload from Gallery
      </Button>
    </div>
  );
};
