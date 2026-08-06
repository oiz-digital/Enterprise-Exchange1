import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const MOCK_ADS = [
  { id: "AD-001", merchant: "USR-089", type: "BUY", asset: "USDT", fiat: "USD", price: "1.01", limits: "100 - 5000", status: "ACTIVE" },
  { id: "AD-002", merchant: "USR-122", type: "SELL", asset: "BTC", fiat: "EUR", price: "60500.00", limits: "500 - 10000", status: "ACTIVE" },
];

const MOCK_P2P_ORDERS = [
  { id: "P2P-ORD-01", adId: "AD-001", buyer: "USR-551", seller: "USR-089", amount: "500 USDT", fiatAmount: "505 USD", status: "PAID_PENDING_RELEASE", date: new Date().toISOString() },
  { id: "P2P-ORD-02", adId: "AD-002", buyer: "USR-122", seller: "USR-334", amount: "0.05 BTC", fiatAmount: "3025 EUR", status: "DISPUTED", date: new Date().toISOString() },
];

export default function P2pPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="P2P Trading" description="Monitor P2P advertisements, orders, and manage disputes." />

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="orders">Active Orders</TabsTrigger>
          <TabsTrigger value="ads">Advertisements</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <DataTable 
            data={MOCK_P2P_ORDERS}
            columns={[
              { header: "Order ID", accessorKey: "id", className: "text-xs" },
              { header: "Buyer", accessorKey: "buyer" },
              { header: "Seller", accessorKey: "seller" },
              { header: "Crypto Amount", accessorKey: "amount" },
              { header: "Fiat Amount", accessorKey: "fiatAmount" },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              { header: "Created", cell: (row) => <span className="text-xs text-muted-foreground">{format(new Date(row.date), 'MMM dd, HH:mm')}</span> }
            ]}
          />
        </TabsContent>

        <TabsContent value="ads">
          <DataTable 
            data={MOCK_ADS}
            columns={[
              { header: "Ad ID", accessorKey: "id", className: "text-xs" },
              { header: "Merchant", accessorKey: "merchant" },
              { header: "Type", cell: (row) => <StatusBadge status={row.type} variant={row.type === 'BUY' ? 'success' : 'destructive'} /> },
              { header: "Asset / Fiat", cell: (row) => `${row.asset} / ${row.fiat}` },
              { header: "Price", accessorKey: "price", className: "font-medium" },
              { header: "Limits", accessorKey: "limits" },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> }
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
