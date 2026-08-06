import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { format } from "date-fns";

const MOCK_TRADES = [
  { id: "TRD-001", market: "BTC_USDT", price: "64000.00", qty: "0.05", maker: "USR-001", taker: "USR-002", makerFee: "0.00005 BTC", takerFee: "3.20 USDT", date: new Date().toISOString() },
  { id: "TRD-002", market: "ETH_USDT", price: "3500.00", qty: "2.5", maker: "USR-003", taker: "USR-001", makerFee: "0.0025 ETH", takerFee: "8.75 USDT", date: new Date().toISOString() },
  { id: "TRD-003", market: "SOL_USDT", price: "145.50", qty: "50.0", maker: "USR-002", taker: "USR-004", makerFee: "0.05 SOL", takerFee: "7.27 USDT", date: new Date(Date.now()-3600000).toISOString() },
];

export default function TradesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trade History" description="Global read-only record of all executed trades." />

      <DataTable 
        data={MOCK_TRADES}
        columns={[
          { header: "Trade ID", accessorKey: "id", className: "text-xs font-mono text-muted-foreground" },
          { header: "Market", accessorKey: "market", className: "font-bold" },
          { header: "Execution Price", accessorKey: "price" },
          { header: "Quantity Executed", accessorKey: "qty" },
          { header: "Total Value", cell: (row) => <span className="font-medium">{(parseFloat(row.price) * parseFloat(row.qty)).toFixed(2)}</span> },
          { header: "Maker ID", cell: (row) => <span className="text-xs text-muted-foreground">{row.maker}</span> },
          { header: "Taker ID", cell: (row) => <span className="text-xs text-muted-foreground">{row.taker}</span> },
          { header: "Fees (M/T)", cell: (row) => <span className="text-xs">{row.makerFee} / {row.takerFee}</span> },
          { header: "Settled At", cell: (row) => <span className="text-xs text-muted-foreground">{format(new Date(row.date), 'MMM dd, HH:mm:ss')}</span> }
        ]}
      />
    </div>
  );
}
