import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";

const MOCK_NETWORKS = [
  { name: "Bitcoin Network", code: "BTC", chainId: null, nativeAsset: "BTC", status: "ACTIVE", confirms: 2 },
  { name: "Ethereum Mainnet", code: "ERC20", chainId: 1, nativeAsset: "ETH", status: "ACTIVE", confirms: 12 },
  { name: "Tron Network", code: "TRC20", chainId: null, nativeAsset: "TRX", status: "ACTIVE", confirms: 1 },
  { name: "BNB Smart Chain", code: "BEP20", chainId: null, nativeAsset: "BNB", status: "ACTIVE", confirms: 1 },
];

export default function NetworksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Networks" description="Manage blockchain networks for deposits and withdrawals.">
        <Button><Plus className="h-4 w-4 mr-2" /> Add Network</Button>
      </PageHeader>

      <DataTable 
        data={MOCK_NETWORKS}
        columns={[
          { header: "Network Name", accessorKey: "name", className: "font-medium" },
          { header: "Code", accessorKey: "code" },
          { header: "Chain ID", cell: (row) => row.chainId || "—" },
          { header: "Native Asset", accessorKey: "nativeAsset" },
          { header: "Required Confirms", accessorKey: "confirms" },
          { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          { 
            header: "Actions", 
            cell: () => (
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            )
          }
        ]}
      />
    </div>
  );
}
