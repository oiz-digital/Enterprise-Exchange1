import { useState } from "react";
import { Edit2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_FEES = [
  { level: "VIP 0", threshold: "$0", maker: "0.1000%", taker: "0.1200%", withdrawal: "Dynamic", status: "ACTIVE" },
  { level: "VIP 1", threshold: "$25,000", maker: "0.0800%", taker: "0.1000%", withdrawal: "Dynamic", status: "ACTIVE" },
  { level: "VIP 2", threshold: "$100,000", maker: "0.0600%", taker: "0.0800%", withdrawal: "Dynamic", status: "ACTIVE" },
  { level: "Market maker", threshold: "By agreement", maker: "-0.0100%", taker: "0.0400%", withdrawal: "Custom", status: "REVIEWING" },
];

export default function FeesPage() {
  const [rows, setRows] = useState(INITIAL_FEES);
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Fee schedules" description="Configure trading, withdrawal, and account-level fee policies.">
        <ScreenActions onRefresh={() => announce("Fee schedules refreshed")} onExport={() => announce("Fee schedule exported")} />
        <Button onClick={() => announce("New fee tier form opened")} data-testid="button-add-fee-tier"><Plus className="h-4 w-4" /> Add tier</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="30-day fee revenue" value="$386,240" detail="+8.1% month over month" tone="positive" />
        <MetricTile label="Average taker fee" value="0.097%" detail="Across active markets" />
        <MetricTile label="Custom schedules" value="18" detail="3 awaiting approval" tone="warning" />
      </div>
      <Card>
        <CardHeader><CardTitle>Fee policy</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div><span className="text-muted-foreground">Fee currency</span><p className="mt-1 font-medium">USDT equivalent</p></div>
          <div><span className="text-muted-foreground">VIP qualification</span><p className="mt-1 font-medium">30-day rolling volume</p></div>
          <div><span className="text-muted-foreground">Effective changes</span><p className="mt-1 font-medium">Require dual approval</p></div>
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Schedule", accessorKey: "level", className: "font-medium" },
        { header: "30-day threshold", accessorKey: "threshold" },
        { header: "Maker", accessorKey: "maker" },
        { header: "Taker", accessorKey: "taker" },
        { header: "Withdrawal fee", accessorKey: "withdrawal" },
        { header: "Status", cell: row => <StatusBadge status={row.status} /> },
        { header: "Actions", cell: row => <Button variant="ghost" size="icon" onClick={() => { setRows(current => current.map(item => item.level === row.level ? { ...item, status: item.status === "ACTIVE" ? "REVIEWING" : "ACTIVE" } : item)); announce(`${row.level} schedule updated`); }} data-testid={`button-edit-fee-${row.level.replaceAll(" ", "-").toLowerCase()}`}><Edit2 className="h-4 w-4" /></Button> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}