import { useState } from "react";
import { Gift, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_REFERRALS = [
  { id: "REF-10482", inviter: "olivia.chen@northstar.io", invitee: "m.lewis@protonmail.com", volume: "$842,190.40", reward: "$2,526.57", tier: "Pro", status: "PAID" },
  { id: "REF-10477", inviter: "marcus.hill@arcadia.dev", invitee: "r.singh@fastmail.com", volume: "$117,840.00", reward: "$353.52", tier: "Standard", status: "PENDING" },
  { id: "REF-10461", inviter: "lena.kim@papertrail.co", invitee: "tomas@lattice.fm", volume: "$64,320.18", reward: "$192.96", tier: "Standard", status: "PAID" },
  { id: "REF-10402", inviter: "daniel.ross@cinder.ai", invitee: "amy@orbitworks.com", volume: "$9,420.00", reward: "$28.26", tier: "Starter", status: "HELD" },
];

export default function ReferralsPage() {
  const [rows, setRows] = useState(INITIAL_REFERRALS);
  const { notice, announce } = useActionNotice();
  const [programEnabled, setProgramEnabled] = useState(true);
  return (
    <div className="space-y-6">
      <PageHeader title="Referral program" description="Track partner attribution, rewards, and referral quality.">
        <ScreenActions onRefresh={() => announce("Referral ledger refreshed")} onExport={() => announce("Referral report queued")} />
        <Button onClick={() => announce("Referral tier editor opened")} data-testid="button-create-tier"><Plus className="h-4 w-4" /> Add tier</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Attributed volume" value="$4.82M" detail="Last 30 days" tone="positive" />
        <MetricTile label="Rewards accrued" value="$14,466" detail="Across 286 referrals" />
        <MetricTile label="Conversion rate" value="18.6%" detail="+2.4% from prior period" tone="positive" />
        <MetricTile label="Held rewards" value="$1,208" detail="4 accounts under review" tone="warning" />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Program controls</CardTitle><p className="mt-1 text-sm text-muted-foreground">Global rules for new referrals.</p></div>
          <Button variant={programEnabled ? "secondary" : "outline"} onClick={() => { setProgramEnabled(!programEnabled); announce(programEnabled ? "Referral program paused" : "Referral program enabled"); }} data-testid="button-toggle-referrals">{programEnabled ? "Enabled" : "Paused"}</Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div><span className="text-muted-foreground">Default commission</span><p className="mt-1 font-medium">30% of trading fees</p></div>
          <div><span className="text-muted-foreground">Attribution window</span><p className="mt-1 font-medium">30 days</p></div>
          <div><span className="text-muted-foreground">Next settlement</span><p className="mt-1 font-medium">Today, 18:00 UTC</p></div>
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Referral", cell: row => <div><div className="font-mono text-xs text-muted-foreground">{row.id}</div><div className="font-medium">{row.inviter}</div></div> },
        { header: "New account", accessorKey: "invitee" },
        { header: "Trading volume", accessorKey: "volume" },
        { header: "Reward", cell: row => <span className="font-medium text-emerald-400">{row.reward}</span> },
        { header: "Tier", accessorKey: "tier" },
        { header: "Status", cell: row => <StatusBadge status={row.status} variant={row.status === "HELD" ? "warning" : undefined} /> },
        { header: "Actions", cell: row => <Button variant="ghost" size="icon" onClick={() => { setRows(current => current.map(item => item.id === row.id ? { ...item, status: item.status === "PENDING" ? "PAID" : item.status } : item)); announce(row.status === "PENDING" ? "Reward marked paid" : "Referral details opened"); }} data-testid={`button-edit-referral-${row.id}`}><Pencil className="h-4 w-4" /></Button> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}