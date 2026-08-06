import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const MOCK_ASSETS = [
  { symbol: "BTC", name: "Bitcoin", type: "COIN", precision: 8, canDeposit: true, canWithdraw: true, canTrade: true, status: "ACTIVE" },
  { symbol: "ETH", name: "Ethereum", type: "COIN", precision: 8, canDeposit: true, canWithdraw: true, canTrade: true, status: "ACTIVE" },
  { symbol: "USDT", name: "Tether", type: "TOKEN", precision: 6, canDeposit: true, canWithdraw: true, canTrade: true, status: "ACTIVE" },
  { symbol: "SOL", name: "Solana", type: "COIN", precision: 8, canDeposit: false, canWithdraw: false, canTrade: true, status: "MAINTENANCE" },
];

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Assets" description="Manage supported cryptocurrencies and fiat assets.">
        <Button><Plus className="h-4 w-4 mr-2" /> Create Asset</Button>
      </PageHeader>

      <DataTable 
        data={MOCK_ASSETS}
        columns={[
          { 
            header: "Asset", 
            cell: (row) => (
              <div className="flex items-center gap-2">
                <div className="font-bold">{row.symbol}</div>
                <div className="text-muted-foreground text-sm">{row.name}</div>
              </div>
            ) 
          },
          { header: "Type", cell: (row) => <span className="text-xs">{row.type}</span> },
          { header: "Precision", accessorKey: "precision" },
          { header: "Deposit", cell: (row) => <Switch checked={row.canDeposit} /> },
          { header: "Withdraw", cell: (row) => <Switch checked={row.canWithdraw} /> },
          { header: "Trade", cell: (row) => <Switch checked={row.canTrade} /> },
          { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          { 
            header: "Actions", 
            cell: () => (
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit2 className="h-4 w-4" />
              </Button>
            )
          }
        ]}
      />
    </div>
  );
}
