import { useState } from "react";
import { BarChart3, Download, FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_REPORTS = [
  { id: "RPT-0821", name: "Monthly financial reconciliation", type: "Finance", range: "Mar 01 – Mar 31", created: "Apr 01, 06:20", status: "READY" },
  { id: "RPT-0818", name: "Daily withdrawals ledger", type: "Operations", range: "Apr 08", created: "Apr 08, 23:05", status: "READY" },
  { id: "RPT-0813", name: "KYC review outcomes", type: "Compliance", range: "Q1 2025", created: "Apr 02, 12:44", status: "READY" },
  { id: "RPT-0801", name: "Market integrity summary", type: "Risk", range: "Mar 24 – Mar 30", created: "Mar 31, 08:17", status: "PROCESSING" },
];

export default function ReportsPage() {
  const [rows, setRows] = useState(INITIAL_REPORTS);
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate operational, financial, and compliance reports.">
        <ScreenActions onRefresh={() => announce("Report library refreshed")} />
        <Button onClick={() => announce("Report builder opened")} data-testid="button-create-report"><Plus className="h-4 w-4" /> Build report</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Reports this month" value="42" detail="8 more than February" />
        <MetricTile label="Scheduled reports" value="7" detail="Delivered to 12 recipients" tone="positive" />
        <MetricTile label="Storage used" value="18.4 GB" detail="Of 100 GB allocated" />
      </div>
      <Card>
        <CardHeader><CardTitle>Quick exports</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {["Account balances", "Transaction ledger", "User activity"].map((label) => (
            <Button key={label} variant="outline" className="justify-between" onClick={() => announce(`${label} export started`)} data-testid={`button-quick-export-${label.toLowerCase().replaceAll(" ", "-")}`}><span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />{label}</span><Download className="h-4 w-4" /></Button>
          ))}
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Report", cell: row => <div><div className="font-mono text-xs text-muted-foreground">{row.id}</div><div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-muted-foreground" />{row.name}</div></div> },
        { header: "Type", accessorKey: "type" },
        { header: "Period", accessorKey: "range" },
        { header: "Created", accessorKey: "created" },
        { header: "Status", cell: row => <StatusBadge status={row.status} /> },
        { header: "Download", cell: row => <Button variant="ghost" size="sm" disabled={row.status !== "READY"} onClick={() => { setRows(current => current.map(item => item.id === row.id ? { ...item, status: "READY" } : item)); announce(`${row.name} download prepared`); }} data-testid={`button-download-report-${row.id}`}><Download className="h-4 w-4" /> CSV</Button> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}