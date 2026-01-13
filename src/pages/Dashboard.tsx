import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { CameraCapture } from "@/components/CameraCapture";
import { ReceiptForm } from "@/components/ReceiptForm";
import { useReceiptUpload } from "@/hooks/useReceiptUpload";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<{ file: File; preview: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadImage, isUploading } = useReceiptUpload();

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

  const handleCapture = async (file: File) => {
    // Create preview
    const preview = URL.createObjectURL(file);
    setCapturedImage({ file, preview });

    // Upload immediately
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

    try {
      const { error } = await supabase.from("receipts").insert({
        user_id: user.id,
        image_path: uploadedPath,
        ...data,
        is_reconciled: false,
      });

      if (error) throw error;

      toast({ title: "Receipt saved successfully" });
      handleCloseForm();
      navigate("/receipts");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving receipt",
        description: error.message,
      });
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
            isLoading={false}
          />
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
