import { useState } from "react";
import { KeyRound, MoreHorizontal, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_ADMINS = [
  { id: "ADM-001", name: "Sofia Anders", email: "sofia.anders@zebvix.com", role: "Super admin", lastSeen: "Just now", status: "ACTIVE", mfa: "Enabled" },
  { id: "ADM-014", name: "Noah Williams", email: "noah.williams@zebvix.com", role: "Risk analyst", lastSeen: "8 min ago", status: "ACTIVE", mfa: "Enabled" },
  { id: "ADM-021", name: "Priya Raman", email: "priya.raman@zebvix.com", role: "Support lead", lastSeen: "Yesterday", status: "ACTIVE", mfa: "Enabled" },
  { id: "ADM-028", name: "Evan Brooks", email: "evan.brooks@zebvix.com", role: "Finance viewer", lastSeen: "Mar 29", status: "SUSPENDED", mfa: "Required" },
];

export default function AdminsPage() {
  const [rows, setRows] = useState(INITIAL_ADMINS);
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Administrators" description="Manage console access for the Zebvix operations team.">
        <ScreenActions onRefresh={() => announce("Administrator directory refreshed")} />
        <Button onClick={() => announce("Invite administrator form opened")} data-testid="button-invite-admin"><UserPlus className="h-4 w-4" /> Invite admin</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Team members" value="24" detail="21 active accounts" />
        <MetricTile label="MFA coverage" value="100%" detail="No exceptions" tone="positive" />
        <MetricTile label="Pending invites" value="2" detail="Expire in 5 days" tone="warning" />
      </div>
      <Card>
        <CardHeader><CardTitle>Access hygiene</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div><span className="text-muted-foreground">Session timeout</span><p className="mt-1 font-medium">30 minutes</p></div>
          <div><span className="text-muted-foreground">Password rotation</span><p className="mt-1 font-medium">Every 90 days</p></div>
          <div><span className="text-muted-foreground">Last access review</span><p className="mt-1 font-medium">Apr 02, 2025</p></div>
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Administrator", cell: row => <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.email}</div></div> },
        { header: "Role", accessorKey: "role" },
        { header: "MFA", cell: row => <span className="flex items-center gap-2 text-sm"><KeyRound className="h-3.5 w-3.5 text-emerald-400" />{row.mfa}</span> },
        { header: "Last active", accessorKey: "lastSeen" },
        { header: "Status", cell: row => <StatusBadge status={row.status} /> },
        { header: "Actions", cell: row => <Button variant="ghost" size="icon" onClick={() => { setRows(current => current.map(item => item.id === row.id ? { ...item, status: item.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } : item)); announce(row.status === "ACTIVE" ? `${row.name} suspended` : `${row.name} reactivated`); }} data-testid={`button-admin-actions-${row.id}`}><MoreHorizontal className="h-4 w-4" /></Button> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}