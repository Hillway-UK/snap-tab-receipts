import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, Check, Loader2 } from "lucide-react";

interface GoogleDriveButtonProps {
  storagePath: string;
  fileName: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function GoogleDriveButton({
  storagePath,
  fileName,
  variant = "outline",
  size = "default",
}: GoogleDriveButtonProps) {
  const { isConnected, isLoading, uploadReceiptBlob, connect } = useGoogleDrive();
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
      // Download from Supabase Storage (authenticated) then upload to Drive
      console.log("Downloading from Storage:", storagePath);
      const { data: blob, error: downloadError } = await supabase.storage
        .from("receipts")
        .download(storagePath);

      if (downloadError || !blob) {
        throw new Error(downloadError?.message || "Failed to download image from storage");
      }

      console.log("Uploading to Drive:", fileName);
      const link = await uploadReceiptBlob(blob, fileName);
      
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
      console.error("Drive upload failed:", error);
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
