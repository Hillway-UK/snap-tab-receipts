import { format } from "date-fns";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Receipt {
  id: string;
  user_id: string;
  image_path: string;
  receipt_date: string | null;
  amount: number | null;
  vendor: string | null;
  category: string | null;
  notes: string | null;
  is_reconciled: boolean;
  created_at: string;
  updated_at: string;
}

interface ReceiptCardProps {
  receipt: Receipt;
  showReconcileToggle?: boolean;
}

export const ReceiptCard = ({ receipt, showReconcileToggle }: ReceiptCardProps) => {
  const { getImageUrl } = useReceiptUpload();
  const toggleReconciled = useToggleReconciled();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/receipts/${receipt.id}`);
  };

  const handleReconcileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleReconcileChange = (checked: boolean) => {
    toggleReconciled.mutate({ id: receipt.id, is_reconciled: checked });
  };

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all hover:shadow-md",
        receipt.is_reconciled && "opacity-75"
      )}
      onClick={handleClick}
    >
      <div className="relative aspect-[4/3] bg-muted">
        <img
          src={getImageUrl(receipt.image_path)}
          alt={receipt.vendor || "Receipt"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {receipt.is_reconciled && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Reconciled
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">
              {receipt.vendor || "Unknown Vendor"}
            </p>
            <p className="text-sm text-muted-foreground">
              {receipt.receipt_date
                ? format(new Date(receipt.receipt_date), "MMM d, yyyy")
                : "No date"}
            </p>
          </div>
          {receipt.amount && (
            <p className="font-semibold text-primary">
              ${receipt.amount.toFixed(2)}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className="text-xs">
            {receipt.category || "Other"}
          </Badge>
          {showReconcileToggle && (
            <div
              className="flex items-center gap-2"
              onClick={handleReconcileClick}
            >
              <Checkbox
                id={`reconcile-${receipt.id}`}
                checked={receipt.is_reconciled}
                onCheckedChange={handleReconcileChange}
                disabled={toggleReconciled.isPending}
              />
              <label
                htmlFor={`reconcile-${receipt.id}`}
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Reconciled
              </label>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
