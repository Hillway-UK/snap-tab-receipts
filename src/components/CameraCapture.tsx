import { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export const CameraCapture = ({ onCapture, disabled }: CameraCaptureProps) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      // Reset input
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* Camera capture - primary action */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        size="lg"
        onClick={() => cameraInputRef.current?.click()}
        disabled={disabled}
        className="h-24 w-24 rounded-full shadow-lg"
      >
        <Camera className="h-10 w-10" />
      </Button>
      <p className="text-sm text-muted-foreground">Tap to take a photo</p>

      {/* Upload from gallery - secondary action */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
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
