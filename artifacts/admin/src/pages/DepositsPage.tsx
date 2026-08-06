import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";

const MOCK_DEPOSITS = [
  { id: "DEP-001", user: "user1@example.com", asset: "USDT", network: "TRC20", amount: "1500.00", txHash: "0x123...abc", confirms: "1/1", status: "COMPLETED", date: new Date().toISOString() },
  { id: "DEP-002", user: "user2@example.com", asset: "BTC", network: "BTC", amount: "0.05", txHash: "1A2...def", confirms: "0/2", status: "PENDING", date: new Date().toISOString() },
  { id: "DEP-003", user: "user3@example.com", asset: "ETH", network: "ERC20", amount: "2.5", txHash: "0x456...789", confirms: "12/12", status: "COMPLETED", date: new Date(Date.now()-86400000).toISOString() },
];

export default function DepositsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Deposits" description="Monitor incoming cryptocurrency deposits." />

      <DataTable 
        data={MOCK_DEPOSITS}
        columns={[
          { header: "ID", accessorKey: "id", className: "text-xs text-muted-foreground" },
          { header: "User", accessorKey: "user" },
          { header: "Asset", cell: (row) => <span className="font-bold">{row.asset}</span> },
          { header: "Network", accessorKey: "network" },
          { header: "Amount", cell: (row) => <span className="font-medium text-green-500">+{row.amount}</span> },
          { header: "Tx Hash", cell: (row) => <a href="#" className="text-primary hover:underline text-xs font-mono">{row.txHash}</a> },
          { header: "Confirms", accessorKey: "confirms" },
          { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          { header: "Detected", cell: (row) => <span className="text-xs text-muted-foreground">{format(new Date(row.date), 'MMM dd, HH:mm')}</span> }
        ]}
      />
    </div>
  );
}
