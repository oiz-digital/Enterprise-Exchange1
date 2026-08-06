import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, History } from "lucide-react";
import { format } from "date-fns";

const MOCK_WALLETS = [
  { id: "WAL-01", user: "user1@example.com", asset: "BTC", available: "1.25000000", locked: "0.50000000", lastReconciled: new Date().toISOString() },
  { id: "WAL-02", user: "user1@example.com", asset: "USDT", available: "54200.00", locked: "1000.00", lastReconciled: new Date().toISOString() },
  { id: "WAL-03", user: "user2@example.com", asset: "ETH", available: "14.5000", locked: "0", lastReconciled: new Date().toISOString() },
];

export default function WalletsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="User Wallets" description="View and reconcile user balances." />

      <div className="flex gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by Email" className="pl-9" />
        </div>
        <Input placeholder="Filter by Asset (e.g. BTC)" className="w-[200px]" />
      </div>

      <DataTable 
        data={MOCK_WALLETS}
        columns={[
          { header: "User", accessorKey: "user" },
          { header: "Asset", accessorKey: "asset", className: "font-bold" },
          { header: "Available", cell: (row) => <span className="font-medium text-green-500">{row.available}</span> },
          { header: "Locked (In Orders)", cell: (row) => <span className="text-muted-foreground">{row.locked}</span> },
          { header: "Total", cell: (row) => <span className="font-bold">{(parseFloat(row.available) + parseFloat(row.locked)).toFixed(8)}</span> },
          { header: "Last Reconciled", cell: (row) => <span className="text-xs text-muted-foreground">{format(new Date(row.lastReconciled), 'MMM dd, HH:mm')}</span> },
          { 
            header: "Actions", 
            cell: () => (
              <Button variant="outline" size="sm">
                Request Adj.
              </Button>
            )
          }
        ]}
      />
    </div>
  );
}
