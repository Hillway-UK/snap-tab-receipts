import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Check, Loader2 } from "lucide-react";

interface GoogleDriveButtonProps {
  imageUrl: string;
  fileName: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function GoogleDriveButton({
  imageUrl,
  fileName,
  variant = "outline",
  size = "default",
}: GoogleDriveButtonProps) {
  const { isConnected, isLoading, uploadReceipt, connect } = useGoogleDrive();
  const { toast } = useToast();
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    setUploading(true);
    try {
      const link = await uploadReceipt(imageUrl, fileName);
      if (link) {
        setUploaded(true);
        toast({
          title: "Saved to Google Drive",
          description: "Receipt uploaded to your SnapTab Receipts folder",
        });
        // Reset uploaded state after 3 seconds
        setTimeout(() => setUploaded(false), 3000);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to save to Google Drive",
      });
    } finally {
      setUploading(false);
    }
  };

  const isWorking = isLoading || uploading;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleUpload}
      disabled={isWorking}
      className="gap-2"
    >
      {isWorking ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : uploaded ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Cloud className="h-4 w-4" />
      )}
      {!isConnected
        ? "Connect Google Drive"
        : uploaded
        ? "Saved!"
        : "Save to Drive"}
    </Button>
  );
}
