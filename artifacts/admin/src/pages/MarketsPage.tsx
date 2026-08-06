import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Power, Ban } from "lucide-react";

const MOCK_MARKETS = [
  { symbol: "BTC_USDT", base: "BTC", quote: "USDT", pricePrecision: 2, qtyPrecision: 5, minQty: 0.0001, makerFee: 0.1, takerFee: 0.1, status: "TRADING" },
  { symbol: "ETH_USDT", base: "ETH", quote: "USDT", pricePrecision: 2, qtyPrecision: 4, minQty: 0.001, makerFee: 0.1, takerFee: 0.1, status: "TRADING" },
  { symbol: "SOL_USDT", base: "SOL", quote: "USDT", pricePrecision: 2, qtyPrecision: 2, minQty: 0.1, makerFee: 0.1, takerFee: 0.1, status: "HALTED" },
];

export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trading Markets" description="Manage spot trading pairs and market parameters.">
        <Button><Plus className="h-4 w-4 mr-2" /> Create Market</Button>
      </PageHeader>

      <DataTable 
        data={MOCK_MARKETS}
        columns={[
          { header: "Market Symbol", accessorKey: "symbol", className: "font-bold" },
          { header: "Base / Quote", cell: (row) => <span className="text-muted-foreground">{row.base} / {row.quote}</span> },
          { header: "Precisions (P/Q)", cell: (row) => `${row.pricePrecision} / ${row.qtyPrecision}` },
          { header: "Min Qty", accessorKey: "minQty" },
          { header: "Fees (M/T %)", cell: (row) => `${row.makerFee}% / ${row.takerFee}%` },
          { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          { 
            header: "Actions", 
            cell: (row) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10">
                  <Power className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10">
                  <Ban className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
