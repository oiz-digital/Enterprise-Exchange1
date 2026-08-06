import { useState } from "react";
import { ClipboardCheck, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_EVENTS = [
  { id: "evt_9c21", actor: "Sofia Anders", action: "Approved withdrawal", target: "WDR-84012 · acct_7F91A2", ip: "185.44.19.20", timestamp: "Today, 10:42:18", result: "SUCCESS" },
  { id: "evt_9c17", actor: "Noah Williams", action: "Updated risk threshold", target: "Velocity / 24h", ip: "10.24.8.14", timestamp: "Today, 10:36:02", result: "SUCCESS" },
  { id: "evt_9c03", actor: "System", action: "Blocked withdrawal", target: "WDR-84006 · acct_1A04CC", ip: "—", timestamp: "Today, 10:21:49", result: "BLOCKED" },
  { id: "evt_9bf1", actor: "Priya Raman", action: "Exported user ledger", target: "Apr 01 – Apr 07", ip: "172.16.4.9", timestamp: "Today, 09:58:11", result: "SUCCESS" },
  { id: "evt_9be4", actor: "Evan Brooks", action: "Failed sign-in", target: "Console login", ip: "89.43.21.7", timestamp: "Today, 09:44:06", result: "FAILED" },
];

export default function AuditPage() {
  const [rows] = useState(INITIAL_EVENTS);
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Immutable record of administrative and automated platform activity.">
        <ScreenActions onRefresh={() => announce("Audit events refreshed")} onExport={() => announce("Audit export queued")} />
        <Button variant="outline" onClick={() => announce("Audit filters opened")} data-testid="button-filter-audit"><Filter className="h-4 w-4" /> Filters</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Events today" value="8,402" detail="All systems" />
        <MetricTile label="Admin actions" value="186" detail="22 high-impact changes" tone="warning" />
        <MetricTile label="Retention" value="7 years" detail="Compliance policy" tone="positive" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input aria-label="Search audit events" placeholder="Search actor, action, target, or event ID" className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" data-testid="input-search-audit" onChange={() => undefined} /></div>
          <Button variant="outline" onClick={() => announce("Showing all audit events")} data-testid="button-audit-range">Last 24 hours</Button>
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Event", cell: row => <div><div className="font-mono text-xs text-muted-foreground">{row.id}</div><div className="font-medium">{row.action}</div></div> },
        { header: "Actor", accessorKey: "actor" },
        { header: "Target", accessorKey: "target" },
        { header: "IP address", accessorKey: "ip", className: "font-mono text-xs" },
        { header: "Timestamp", accessorKey: "timestamp", className: "text-xs" },
        { header: "Result", cell: row => <StatusBadge status={row.result} variant={row.result === "BLOCKED" ? "warning" : undefined} /> },
        { header: "Details", cell: row => <Button variant="ghost" size="icon" onClick={() => announce(`Viewing ${row.id}`)} data-testid={`button-view-audit-${row.id}`}><ClipboardCheck className="h-4 w-4" /></Button> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}