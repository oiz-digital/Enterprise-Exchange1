import { useState, type ReactNode } from "react";
import { Check, Globe2, Save, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionNotice, ScreenActions, useActionNotice } from "./AdminScreenParts";

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="shrink-0">{children}</div></div>;
}

export default function SettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [withdrawals, setWithdrawals] = useState(true);
  const [timezone, setTimezone] = useState("UTC");
  const { notice, announce } = useActionNotice();
  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" description="Review global configuration and operational safeguards.">
        <ScreenActions onRefresh={() => announce("Settings refreshed")} />
        <Button onClick={() => announce("All settings saved")} data-testid="button-save-settings"><Save className="h-4 w-4" /> Save changes</Button>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>General</CardTitle><CardDescription>Default presentation and regional preferences.</CardDescription></CardHeader>
            <CardContent>
              <SettingRow title="Platform name" description="Shown in operator emails and audit exports."><input defaultValue="Zebvix Exchange" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary sm:w-56" data-testid="input-platform-name" /></SettingRow>
              <SettingRow title="Default timezone" description="Used for reports and scheduled communications."><select value={timezone} onChange={event => setTimezone(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-timezone"><option value="UTC">UTC</option><option value="America/New_York">America / New York</option><option value="Europe/London">Europe / London</option><option value="Asia/Singapore">Asia / Singapore</option></select></SettingRow>
              <SettingRow title="Base settlement currency" description="Reference currency for platform reporting."><span className="rounded-md border border-border bg-muted px-3 py-2 text-sm">USDT</span></SettingRow>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Operational safeguards</CardTitle><CardDescription>Controls that affect live account activity.</CardDescription></CardHeader>
            <CardContent>
              <SettingRow title="Withdrawal processing" description="Allow users to submit new withdrawal requests."><Button variant={withdrawals ? "secondary" : "destructive"} onClick={() => { setWithdrawals(!withdrawals); announce(withdrawals ? "Withdrawals paused" : "Withdrawals enabled"); }} data-testid="button-toggle-withdrawals">{withdrawals ? "Enabled" : "Paused"}</Button></SettingRow>
              <SettingRow title="Maintenance mode" description="Restrict trading and account activity to operators."><Button variant={maintenance ? "destructive" : "outline"} onClick={() => { setMaintenance(!maintenance); announce(maintenance ? "Maintenance mode disabled" : "Maintenance mode enabled"); }} data-testid="button-toggle-maintenance">{maintenance ? "Enabled" : "Disabled"}</Button></SettingRow>
              <SettingRow title="Two-person approvals" description="Require a second administrator for sensitive actions."><span className="flex items-center gap-2 text-sm text-emerald-400"><Check className="h-4 w-4" /> Required</span></SettingRow>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Security posture</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">API key encryption</span><span className="text-emerald-400">Healthy</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Audit integrity</span><span className="text-emerald-400">Verified</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Last security review</span><span>Apr 02</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-muted-foreground" /> Service endpoints</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Trading API</span><span className="font-mono text-xs">api.zebvix.com</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Websocket</span><span className="font-mono text-xs">stream.zebvix.com</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span className="text-amber-400">Production</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
      <ActionNotice message={notice} />
    </div>
  );
}