import { useState } from "react";
import { Check, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricTile({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "positive" | "warning" }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${tone === "positive" ? "text-emerald-400" : tone === "warning" ? "text-amber-400" : "text-foreground"}`}>{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function ScreenActions({ onRefresh, onExport, exportLabel = "Export" }: { onRefresh?: () => void; onExport?: () => void; exportLabel?: string }) {
  return (
    <div className="flex items-center gap-2">
      {onRefresh && <Button variant="outline" size="sm" onClick={onRefresh} data-testid="button-refresh"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>}
      {onExport && <Button variant="outline" size="sm" onClick={onExport} data-testid="button-export"><Download className="h-3.5 w-3.5" /> {exportLabel}</Button>}
    </div>
  );
}

export function ActionNotice({ message }: { message: string }) {
  return message ? (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 shadow-lg" role="status" data-testid="status-action">
      <Check className="h-4 w-4" /> {message}
    </div>
  ) : null;
}

export function useActionNotice() {
  const [notice, setNotice] = useState("");
  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  return { notice, announce };
}