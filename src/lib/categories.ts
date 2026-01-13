export const RECEIPT_CATEGORIES = [
  { value: "Office", label: "Office" },
  { value: "Travel", label: "Travel" },
  { value: "Meals", label: "Meals" },
  { value: "Supplies", label: "Supplies" },
  { value: "Other", label: "Other" },
] as const;

export type ReceiptCategory = typeof RECEIPT_CATEGORIES[number]["value"];
