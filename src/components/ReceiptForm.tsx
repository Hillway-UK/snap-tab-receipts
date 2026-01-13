import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECEIPT_CATEGORIES } from "@/lib/categories";
import type { Receipt } from "@/lib/types";

interface ReceiptFormProps {
  receipt?: Partial<Receipt>;
  onSave: (data: {
    receipt_date: string;
    amount: number | null;
    vendor: string | null;
    category: string;
    notes: string | null;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export const ReceiptForm = ({
  receipt,
  onSave,
  onCancel,
  isLoading,
  isReadOnly,
}: ReceiptFormProps) => {
  const [date, setDate] = useState(
    receipt?.receipt_date || new Date().toISOString().split("T")[0]
  );
  const [amount, setAmount] = useState(receipt?.amount?.toString() || "");
  const [vendor, setVendor] = useState(receipt?.vendor || "");
  const [category, setCategory] = useState(receipt?.category || "Other");
  const [notes, setNotes] = useState(receipt?.notes || "");

  useEffect(() => {
    if (receipt) {
      setDate(receipt.receipt_date || new Date().toISOString().split("T")[0]);
      setAmount(receipt.amount?.toString() || "");
      setVendor(receipt.vendor || "");
      setCategory(receipt.category || "Other");
      setNotes(receipt.notes || "");
    }
  }, [receipt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      receipt_date: date,
      amount: amount ? parseFloat(amount) : null,
      vendor: vendor || null,
      category,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vendor">Vendor / Store</Label>
        <Input
          id="vendor"
          placeholder="Enter vendor name"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={category}
          onValueChange={setCategory}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {RECEIPT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isReadOnly}
          rows={3}
        />
      </div>

      {!isReadOnly && (
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
};
