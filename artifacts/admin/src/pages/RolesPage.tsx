import { useState } from "react";
import { Edit2, LockKeyhole, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_ROLES = [
  { name: "Super admin", description: "Full platform access", members: 2, permissions: 48, updated: "Apr 02, 2025", status: "SYSTEM" },
  { name: "Operations manager", description: "Funds and account operations", members: 5, permissions: 31, updated: "Mar 28, 2025", status: "ACTIVE" },
  { name: "Risk analyst", description: "Risk queue and account controls", members: 7, permissions: 22, updated: "Mar 21, 2025", status: "ACTIVE" },
  { name: "Finance viewer", description: "Read-only financial reporting", members: 4, permissions: 12, updated: "Mar 14, 2025", status: "ACTIVE" },
];

export default function RolesPage() {
  const [rows, setRows] = useState(INITIAL_ROLES);
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Roles & permissions" description="Define least-privilege access for every console function.">
        <ScreenActions onRefresh={() => announce("Roles refreshed")} />
        <Button onClick={() => announce("Role builder opened")} data-testid="button-create-role"><Plus className="h-4 w-4" /> Create role</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Roles" value="8" detail="4 custom roles" />
        <MetricTile label="Permission grants" value="156" detail="Across 24 administrators" />
        <MetricTile label="Unreviewed changes" value="3" detail="Require owner approval" tone="warning" />
      </div>
      <Card>
        <CardHeader><CardTitle>Permission model</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary" /><span>Dual approval for funds</span><StatusBadge status="ENABLED" /></div>
          <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary" /><span>IP allowlist</span><StatusBadge status="ENABLED" /></div>
          <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary" /><span>Role change audit</span><StatusBadge status="ENABLED" /></div>
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Role", cell: row => <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.description}</div></div> },
        { header: "Members", accessorKey: "members" },
        { header: "Permissions", accessorKey: "permissions" },
        { header: "Last updated", accessorKey: "updated" },
        { header: "Status", cell: row => <StatusBadge status={row.status} /> },
        { header: "Actions", cell: row => <Button variant="ghost" size="icon" disabled={row.status === "SYSTEM"} onClick={() => { setRows(current => current.map(item => item.name === row.name ? { ...item, updated: "Just now" } : item)); announce(`${row.name} permissions opened`); }} data-testid={`button-edit-role-${row.name.replaceAll(" ", "-").toLowerCase()}`}><Edit2 className="h-4 w-4" /></Button> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}