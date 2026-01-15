import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/supabase-db";
import { BottomNav } from "@/components/BottomNav";
import { ReceiptForm } from "@/components/ReceiptForm";
import { ShareButton } from "@/components/ShareButton";
import { GoogleDriveButton } from "@/components/GoogleDriveButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import type { User } from "@supabase/supabase-js";
import type { Receipt } from "@/lib/types";

const ReceiptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected: isDriveConnected, deleteReceipt: deleteFromDrive } = useGoogleDrive();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: roleData } = await db
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();
        setUserRole(roleData?.role || null);
      } else {
        navigate("/");
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchReceipt = async () => {
      const { data, error } = await db
        .from("receipts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Receipt not found",
          description: error.message,
        });
        navigate("/receipts");
      } else {
        setReceipt(data as Receipt);
      }
    };

    fetchReceipt();
  }, [user, id, navigate, toast]);

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("receipts").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async (data: {
    receipt_date: string;
    amount: number | null;
    vendor: string | null;
    category: string;
    notes: string | null;
  }) => {
    if (!id) return;
    setIsSaving(true);

    try {
      const { error } = await db
        .from("receipts")
        .update({
          receipt_date: data.receipt_date,
          amount: data.amount,
          vendor: data.vendor,
          category: data.category,
          notes: data.notes,
        })
        .eq("id", id);

      if (error) throw error;

      setReceipt((prev) => (prev ? { ...prev, ...data } : null));
      setIsEditing(false);
      toast({ title: "Receipt updated" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating receipt",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !receipt) return;

    try {
      // Delete image from storage
      await supabase.storage.from("receipts").remove([receipt.image_path]);

      // Delete receipt record
      const { error } = await db.from("receipts").delete().eq("id", id);
      if (error) throw error;

      // Try to delete from Google Drive (non-blocking)
      if (isDriveConnected) {
        try {
          await deleteFromDrive(receipt.vendor, receipt.receipt_date);
        } catch (driveError) {
          console.warn("Failed to delete from Google Drive:", driveError);
        }
      }

      toast({ title: "Receipt deleted" });
      navigate("/receipts");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting receipt",
        description: error.message,
      });
    }
  };

  const handleToggleReconciled = async (checked: boolean) => {
    if (!id) return;

    try {
      const { error } = await db
        .from("receipts")
        .update({ is_reconciled: checked })
        .eq("id", id);

      if (error) throw error;

      setReceipt((prev) => (prev ? { ...prev, is_reconciled: checked } : null));
      toast({ title: checked ? "Marked as reconciled" : "Marked as unreconciled" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating receipt",
        description: error.message,
      });
    }
  };

  const isOwner = userRole === "owner";

  if (loading || !receipt) {
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
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/receipts")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {isOwner && !isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The receipt and its image will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Receipt Image */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-0">
            <img
              src={getImageUrl(receipt.image_path)}
              alt={receipt.vendor || "Receipt"}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Share & Drive Buttons */}
        <div className="mb-6 flex gap-2">
          <ShareButton
            imageUrl={getImageUrl(receipt.image_path)}
            fileName={`receipt-${receipt.receipt_date || receipt.id}.jpg`}
            variant="default"
            size="lg"
          />
          <GoogleDriveButton
            imageUrl={getImageUrl(receipt.image_path)}
            fileName={`receipt-${receipt.vendor || receipt.id}-${receipt.receipt_date || "unknown"}.jpg`}
            variant="outline"
            size="lg"
          />
        </div>

        {/* Reconcile Toggle (for viewers) */}
        {!isOwner && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-muted">
            <Checkbox
              id="reconciled"
              checked={receipt.is_reconciled}
              onCheckedChange={handleToggleReconciled}
            />
            <label htmlFor="reconciled" className="text-sm font-medium cursor-pointer">
              Mark as Reconciled
            </label>
          </div>
        )}

        {/* Receipt Form */}
        <ReceiptForm
          receipt={receipt}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          isLoading={isSaving}
          isReadOnly={!isEditing || !isOwner}
        />
      </div>

      <BottomNav />
    </div>
  );
};

export default ReceiptDetail;
