import { useState } from "react";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_ALERTS = [
  { id: "RSK-8821", account: "acct_7F91A2", signal: "Velocity anomaly", exposure: "$284,900", opened: "12 min ago", status: "OPEN", severity: "HIGH" },
  { id: "RSK-8817", account: "acct_1A04CC", signal: "New device + withdrawal", exposure: "$42,500", opened: "38 min ago", status: "REVIEWING", severity: "MEDIUM" },
  { id: "RSK-8802", account: "acct_9B88D0", signal: "Impossible travel", exposure: "$8,120", opened: "2 hr ago", status: "OPEN", severity: "LOW" },
  { id: "RSK-8789", account: "acct_4D210E", signal: "Sanctions list match", exposure: "$0", opened: "Yesterday", status: "RESOLVED", severity: "CRITICAL" },
];

export default function RiskPage() {
  const [rows, setRows] = useState(INITIAL_ALERTS);
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Risk operations" description="Review account signals, exposure, and automated controls.">
        <ScreenActions onRefresh={() => announce("Risk queue refreshed")} onExport={() => announce("Risk queue exported")} />
        <Button onClick={() => announce("Rule builder opened")} data-testid="button-add-risk-rule"><SlidersHorizontal className="h-4 w-4" /> Manage rules</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Open alerts" value="27" detail="6 require action today" tone="warning" />
        <MetricTile label="At-risk exposure" value="$1.42M" detail="Across 11 accounts" tone="warning" />
        <MetricTile label="Auto-block rate" value="94.8%" detail="Last 7 days" tone="positive" />
        <MetricTile label="False positives" value="2.1%" detail="Down 0.6% from last week" tone="positive" />
      </div>
      <Card>
        <CardHeader><CardTitle>Control posture</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-emerald-400" /><span>Withdrawal screening</span><StatusBadge status="ENABLED" /></div>
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-emerald-400" /><span>Velocity limits</span><StatusBadge status="ENABLED" /></div>
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-400" /><span>Travel rule sync</span><StatusBadge status="REVIEWING" /></div>
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Alert", cell: row => <div><div className="font-mono text-xs text-muted-foreground">{row.id}</div><div className="font-medium">{row.signal}</div></div> },
        { header: "Account", accessorKey: "account", className: "font-mono text-xs" },
        { header: "Exposure", accessorKey: "exposure" },
        { header: "Severity", cell: row => <StatusBadge status={row.severity} /> },
        { header: "Opened", accessorKey: "opened" },
        { header: "Status", cell: row => <StatusBadge status={row.status} /> },
        { header: "Review", cell: row => <Button variant="outline" size="sm" onClick={() => { setRows(current => current.map(item => item.id === row.id ? { ...item, status: item.status === "RESOLVED" ? "OPEN" : "RESOLVED" } : item)); announce(row.status === "RESOLVED" ? "Alert reopened" : "Alert resolved"); }} data-testid={`button-review-risk-${row.id}`}>{row.status === "RESOLVED" ? "Reopen" : "Resolve"}</Button> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}