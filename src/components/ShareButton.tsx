import { Share, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  imageUrl: string;
  fileName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ShareButton = ({
  imageUrl,
  fileName = "receipt.jpg",
  variant = "outline",
  size = "default",
}: ShareButtonProps) => {
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      // Check if Web Share API is available and supports sharing files
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Receipt",
        });
      } else {
        // Fallback: download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Receipt downloaded" });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({
          variant: "destructive",
          title: "Share failed",
          description: error.message,
        });
      }
    }
  };

  const supportsNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Button variant={variant} size={size} onClick={handleShare} className="gap-2">
      {supportsNativeShare ? (
        <>
          <Share className="h-4 w-4" />
          Save to Files
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download
        </>
      )}
    </Button>
  );
};
