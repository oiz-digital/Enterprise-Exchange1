import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";

const MOCK_ORDERS = [
  { id: "ORD-001", user: "user1@example.com", market: "BTC_USDT", side: "BUY", type: "LIMIT", price: "64000.00", qty: "0.5", filledPct: 100, status: "FILLED", date: new Date().toISOString() },
  { id: "ORD-002", user: "user2@example.com", market: "ETH_USDT", side: "SELL", type: "LIMIT", price: "3500.00", qty: "10.0", filledPct: 25, status: "OPEN", date: new Date().toISOString() },
  { id: "ORD-003", user: "user3@example.com", market: "SOL_USDT", side: "BUY", type: "MARKET", price: "MARKET", qty: "100.0", filledPct: 100, status: "FILLED", date: new Date(Date.now()-86400000).toISOString() },
  { id: "ORD-004", user: "user1@example.com", market: "BTC_USDT", side: "SELL", type: "STOP_LIMIT", price: "60000.00", qty: "0.1", filledPct: 0, status: "CANCELLED", date: new Date(Date.now()-172800000).toISOString() },
];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Order Book" description="Read-only view of all user trading orders across markets." />

      <DataTable 
        data={MOCK_ORDERS}
        columns={[
          { header: "ID", accessorKey: "id", className: "text-xs text-muted-foreground" },
          { header: "User", accessorKey: "user" },
          { header: "Market", accessorKey: "market", className: "font-bold" },
          { header: "Side", cell: (row) => <StatusBadge status={row.side} variant={row.side === 'BUY' ? 'success' : 'destructive'} /> },
          { header: "Type", accessorKey: "type", className: "text-xs" },
          { header: "Price", accessorKey: "price" },
          { header: "Qty", accessorKey: "qty" },
          { 
            header: "Filled", 
            cell: (row) => (
              <div className="flex items-center gap-2 w-full max-w-[100px]">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${row.filledPct}%` }}></div>
                </div>
                <span className="text-xs">{row.filledPct}%</span>
              </div>
            ) 
          },
          { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          { header: "Created", cell: (row) => <span className="text-xs text-muted-foreground">{format(new Date(row.date), 'MMM dd, HH:mm')}</span> }
        ]}
      />
    </div>
  );
}
