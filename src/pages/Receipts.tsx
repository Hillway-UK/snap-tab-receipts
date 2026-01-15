import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/supabase-db";
import { BottomNav } from "@/components/BottomNav";
import { ReceiptCard } from "@/components/ReceiptCard";
import { ReceiptFilters } from "@/components/ReceiptFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Plus, ExternalLink, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import type { User } from "@supabase/supabase-js";
import type { Receipt, ReceiptFilters as ReceiptFiltersType } from "@/lib/types";

const Receipts = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filters, setFilters] = useState<ReceiptFiltersType>({});
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"reader" | "writer">("reader");
  const [isSharing, setIsSharing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected: isDriveConnected, openFolder, shareFolder, isLoading: isDriveLoading } = useGoogleDrive();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Fetch user role
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

  const fetchReceipts = useCallback(async () => {
    if (!user) return;

    let query = db
      .from("receipts")
      .select("*")
      .order("receipt_date", { ascending: false });

    if (filters.startDate) {
      query = query.gte("receipt_date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("receipt_date", filters.endDate);
    }
    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    const { data, error } = await query;
    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading receipts",
        description: error.message,
      });
    } else {
      setReceipts((data || []) as Receipt[]);
    }
  }, [user, filters, toast]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleExportCSV = () => {
    if (receipts.length === 0) {
      toast({ title: "No receipts to export" });
      return;
    }

    const headers = ["Date", "Vendor", "Amount", "Category", "Notes", "Reconciled"];
    const rows = receipts.map((r) => [
      r.receipt_date || "",
      r.vendor || "",
      r.amount?.toString() || "",
      r.category || "",
      r.notes || "",
      r.is_reconciled ? "Yes" : "No",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipts-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "CSV exported" });
  };

  const handleOpenDriveFolder = async () => {
    try {
      await openFolder();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to open folder",
        description: error.message,
      });
    }
  };

  const handleShareFolder = async () => {
    if (!shareEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter an email address to share with.",
      });
      return;
    }

    setIsSharing(true);
    try {
      await shareFolder(shareEmail.trim(), shareRole);
      toast({
        title: "Folder shared",
        description: `Shared with ${shareEmail} as ${shareRole === "reader" ? "Viewer" : "Editor"}.`,
      });
      setShowShareDialog(false);
      setShareEmail("");
      setShareRole("reader");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to share folder",
        description: error.message,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const isOwner = userRole === "owner";

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Receipts</h1>
            <p className="text-sm text-muted-foreground">
              {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isOwner && (
            <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <ReceiptFilters filters={filters} onFiltersChange={setFilters} />
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          {isDriveConnected && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpenDriveFolder} 
                disabled={isDriveLoading}
                className="gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                View GDrive
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowShareDialog(true)} 
                className="gap-1"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </>
          )}
        </div>

        {/* Receipt Grid */}
        {receipts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No receipts found</p>
            {isOwner && (
              <Button
                variant="link"
                onClick={() => navigate("/dashboard")}
                className="mt-2"
              >
                Capture your first receipt
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {receipts.map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                showReconcileToggle={!isOwner}
                onReconcileChange={fetchReceipts}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share Folder Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Receipts Folder</DialogTitle>
            <DialogDescription>
              Share your SnapTab Receipts folder in Google Drive with another person.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="share-email">Email address</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="colleague@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-role">Permission level</Label>
              <Select value={shareRole} onValueChange={(v) => setShareRole(v as "reader" | "writer")}>
                <SelectTrigger id="share-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Viewer (can view only)</SelectItem>
                  <SelectItem value="writer">Editor (can view and edit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleShareFolder} disabled={isSharing}>
              {isSharing ? "Sharing..." : "Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Receipts;
