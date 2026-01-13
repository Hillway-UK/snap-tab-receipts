export interface Receipt {
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

export interface ReceiptFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  isReconciled?: boolean;
}

export type AppRole = "owner" | "viewer" | null;
