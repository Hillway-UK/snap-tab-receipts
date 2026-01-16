import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/supabase-db";
import { BottomNav } from "@/components/BottomNav";
import { CameraCapture } from "@/components/CameraCapture";
import { ReceiptForm } from "@/components/ReceiptForm";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<{ file: File; preview: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadReceiptBlob } = useGoogleDrive();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          navigate("/");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      return fileName;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCapture = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setCapturedImage({ file, preview });

    const path = await uploadImage(file);
    if (path) {
      setUploadedPath(path);
      setShowForm(true);
    } else {
      URL.revokeObjectURL(preview);
      setCapturedImage(null);
    }
  };

  const handleSaveReceipt = async (data: {
    receipt_date: string;
    amount: number | null;
    vendor: string | null;
    category: string;
    notes: string | null;
  }) => {
    if (!uploadedPath || !user) return;

    setIsSaving(true);
    try {
      const { error } = await db.from("receipts").insert({
        user_id: user.id,
        image_path: uploadedPath,
        receipt_date: data.receipt_date,
        amount: data.amount,
        vendor: data.vendor,
        category: data.category,
        notes: data.notes,
        is_reconciled: false,
      });

      if (error) throw error;

      toast({ title: "Receipt saved successfully" });

      // Auto-save to Google Drive (uses local file, not public URL)
      if (capturedImage?.file) {
        try {
          const fileName = `receipt-${data.vendor || "unknown"}-${data.receipt_date}.${uploadedPath.split(".").pop()}`;
          console.log("Auto-backing up to Drive:", fileName);
          await uploadReceiptBlob(capturedImage.file, fileName);
          toast({ title: "Also backed up to Google Drive" });
        } catch (driveError: any) {
          console.warn("Drive backup failed:", driveError);
          toast({
            variant: "default",
            title: "Google Drive backup skipped",
            description:
              driveError?.message || "Connect Google Drive to enable automatic backups.",
          });
        }
      }

      handleCloseForm();
      navigate("/receipts");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving receipt",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseForm = () => {
    if (capturedImage?.preview) {
      URL.revokeObjectURL(capturedImage.preview);
    }
    setCapturedImage(null);
    setUploadedPath(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">SnapTab</h1>
          <p className="text-sm text-muted-foreground">Capture a receipt to get started</p>
        </div>

        {/* Capture Area */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <CameraCapture onCapture={handleCapture} disabled={isUploading} />
            {isUploading && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Uploading...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent receipts hint */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/receipts")}
            className="text-sm text-primary hover:underline underline-offset-4"
          >
            View all receipts →
          </button>
        </div>
      </div>

      {/* Receipt Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Receipt Details</DialogTitle>
          </DialogHeader>
          {capturedImage && (
            <div className="mb-4 rounded-lg overflow-hidden bg-muted">
              <img
                src={capturedImage.preview}
                alt="Captured receipt"
                className="w-full h-48 object-contain"
              />
            </div>
          )}
          <ReceiptForm
            onSave={handleSaveReceipt}
            onCancel={handleCloseForm}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
