import { cn } from "@/lib/utils";

type StatusVariant = "default" | "success" | "warning" | "destructive" | "info" | "neutral";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
  variant?: StatusVariant;
}

export function StatusBadge({ status, variant, className, ...props }: StatusBadgeProps) {
  let finalVariant: StatusVariant = variant || "default";

  if (!variant) {
    const s = status.toUpperCase();
    if (["ACTIVE", "APPROVED", "SUCCESS", "COMPLETED", "FILLED", "TRADING", "ENABLED", "RESOLVED"].includes(s)) {
      finalVariant = "success";
    } else if (["PENDING", "PROCESSING", "REVIEWING", "UNDER_REVIEW", "HALTED", "MEDIUM"].includes(s)) {
      finalVariant = "warning";
    } else if (["REJECTED", "FAILED", "SUSPENDED", "RESTRICTED", "CANCELLED", "DISABLED", "CRITICAL", "HIGH"].includes(s)) {
      finalVariant = "destructive";
    } else if (["NEW", "OPEN", "LOW"].includes(s)) {
      finalVariant = "info";
    } else {
      finalVariant = "neutral";
    }
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide border",
        {
          "bg-primary/10 text-primary border-primary/20": finalVariant === "default",
          "bg-green-500/10 text-green-500 border-green-500/20": finalVariant === "success",
          "bg-amber-500/10 text-amber-500 border-amber-500/20": finalVariant === "warning",
          "bg-red-500/10 text-red-500 border-red-500/20": finalVariant === "destructive",
          "bg-blue-500/10 text-blue-500 border-blue-500/20": finalVariant === "info",
          "bg-muted text-muted-foreground border-border": finalVariant === "neutral",
        },
        className
      )}
      {...props}
    >
      {status}
    </div>
  );
}
