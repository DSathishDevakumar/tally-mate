import { EmptyState } from "../../../src/components/EmptyState";

export default function Billing() {
  return (
    <EmptyState
      icon="receipt-outline"
      title="Monthly Billing"
      description="Auto-compiled monthly bills, PDF generation, and paid/partial/due status — coming soon."
    />
  );
}
