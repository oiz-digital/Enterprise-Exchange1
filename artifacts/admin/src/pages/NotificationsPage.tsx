import { useState } from "react";
import { BellPlus, Edit2, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, MetricTile, ScreenActions, useActionNotice } from "./AdminScreenParts";

const INITIAL_NOTIFICATIONS = [
  { id: "NTF-2409", title: "Scheduled ETH network maintenance", channel: "In-app + email", audience: "ETH holders", sent: "Today, 09:12", status: "SENT" },
  { id: "NTF-2407", title: "Updated verification requirements", channel: "In-app", audience: "Unverified users", sent: "Yesterday, 16:40", status: "SENT" },
  { id: "NTF-2412", title: "Weekend trading competition", channel: "Push + email", audience: "All active traders", sent: "Scheduled 18:00", status: "SCHEDULED" },
  { id: "NTF-2396", title: "New API rate limits", channel: "Email", audience: "API users", sent: "Mar 14, 11:05", status: "DRAFT" },
];

export default function NotificationsPage() {
  const [rows, setRows] = useState(INITIAL_NOTIFICATIONS);
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Compose, schedule, and review platform communications.">
        <ScreenActions onRefresh={() => announce("Notification center refreshed")} />
        <Button onClick={() => announce("Notification composer opened")} data-testid="button-create-notification"><BellPlus className="h-4 w-4" /> Compose</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Delivered this week" value="48,219" detail="99.2% delivery rate" tone="positive" />
        <MetricTile label="Scheduled" value="3" detail="Next send in 2h 14m" />
        <MetricTile label="Open rate" value="64.7%" detail="+4.8% vs. prior week" tone="positive" />
      </div>
      <Card>
        <CardHeader><CardTitle>Delivery health</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div><span className="text-muted-foreground">In-app</span><p className="mt-1 font-medium text-emerald-400">100% operational</p></div>
          <div><span className="text-muted-foreground">Email provider</span><p className="mt-1 font-medium text-emerald-400">99.8% operational</p></div>
          <div><span className="text-muted-foreground">Push provider</span><p className="mt-1 font-medium text-amber-400">Degraded · monitoring</p></div>
        </CardContent>
      </Card>
      <DataTable data={rows} columns={[
        { header: "Message", cell: row => <div><div className="font-mono text-xs text-muted-foreground">{row.id}</div><div className="font-medium">{row.title}</div></div> },
        { header: "Channel", accessorKey: "channel" },
        { header: "Audience", accessorKey: "audience" },
        { header: "Send time", accessorKey: "sent" },
        { header: "Status", cell: row => <StatusBadge status={row.status} /> },
        { header: "Actions", cell: row => <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => announce(`${row.id} opened for editing`)} data-testid={`button-edit-notification-${row.id}`}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setRows(current => current.map(item => item.id === row.id ? { ...item, status: "SENT", sent: "Just now" } : item)); announce(`${row.id} sent`); }} data-testid={`button-send-notification-${row.id}`}><Send className="h-4 w-4" /></Button></div> },
      ]} />
      <ActionNotice message={notice} />
    </div>
  );
}