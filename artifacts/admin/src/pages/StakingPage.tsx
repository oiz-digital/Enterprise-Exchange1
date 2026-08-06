import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MOCK_PRODUCTS = [
  { id: "STK-BTC-30", asset: "BTC", name: "Bitcoin 30D Fixed", duration: "30 Days", apy: "5.5%", status: "ACTIVE" },
  { id: "STK-ETH-FLEX", asset: "ETH", name: "Ethereum Flexible", duration: "Flexible", apy: "3.2%", status: "ACTIVE" },
  { id: "STK-USDT-90", asset: "USDT", name: "USDT 90D High Yield", duration: "90 Days", apy: "12.0%", status: "DISABLED" },
];

const MOCK_POSITIONS = [
  { id: "POS-01", user: "user1@example.com", product: "STK-BTC-30", amount: "0.5 BTC", earned: "0.002 BTC", status: "ACTIVE" },
  { id: "POS-02", user: "user2@example.com", product: "STK-ETH-FLEX", amount: "10 ETH", earned: "0.15 ETH", status: "ACTIVE" },
  { id: "POS-03", user: "user3@example.com", product: "STK-USDT-90", amount: "10000 USDT", earned: "300 USDT", status: "COMPLETED" },
];

export default function StakingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Staking & Earn" description="Manage staking products and view user positions.">
        <Button><Plus className="h-4 w-4 mr-2" /> Create Product</Button>
      </PageHeader>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="products">Staking Products</TabsTrigger>
          <TabsTrigger value="positions">User Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <DataTable 
            data={MOCK_PRODUCTS}
            columns={[
              { header: "Asset", accessorKey: "asset", className: "font-bold" },
              { header: "Product Name", accessorKey: "name" },
              { header: "Duration", accessorKey: "duration" },
              { header: "Estimated APY", cell: (row) => <span className="font-medium text-green-500">{row.apy}</span> },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              { 
                header: "Actions", 
                cell: () => (
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                )
              }
            ]}
          />
        </TabsContent>

        <TabsContent value="positions">
          <DataTable 
            data={MOCK_POSITIONS}
            columns={[
              { header: "User", accessorKey: "user" },
              { header: "Product", accessorKey: "product" },
              { header: "Staked Amount", accessorKey: "amount", className: "font-medium" },
              { header: "Yield Earned", cell: (row) => <span className="text-green-500">{row.earned}</span> },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> }
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
