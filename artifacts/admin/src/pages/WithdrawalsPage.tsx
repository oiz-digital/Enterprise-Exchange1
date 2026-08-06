import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, X, ShieldAlert } from "lucide-react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MOCK_WITHDRAWALS = [
  { id: "WD-001", user: "user1@example.com", asset: "USDT", amount: "5000.00", fee: "1.00", destination: "0x123...abc", risk: "LOW", status: "PENDING", date: new Date().toISOString() },
  { id: "WD-002", user: "user2@example.com", asset: "BTC", amount: "2.5", fee: "0.0005", destination: "1A2...def", risk: "HIGH", status: "REVIEWING", date: new Date().toISOString() },
  { id: "WD-003", user: "user3@example.com", asset: "ETH", amount: "1.2", fee: "0.002", destination: "0x456...789", risk: "LOW", status: "COMPLETED", date: new Date(Date.now()-86400000).toISOString() },
];

export default function WithdrawalsPage() {
  const [selected, setSelected] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve"|"reject"|null>(null);
  const [reason, setReason] = useState("");

  const handleAction = () => {
    // Process action
    setActionType(null);
    setSelected(null);
    setReason("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Withdrawals" description="Review, approve, or reject user withdrawal requests." />

      <DataTable 
        data={MOCK_WITHDRAWALS}
        columns={[
          { header: "ID", accessorKey: "id", className: "text-xs text-muted-foreground" },
          { header: "User", accessorKey: "user" },
          { header: "Asset", cell: (row) => <span className="font-bold">{row.asset}</span> },
          { header: "Amount", cell: (row) => <span className="font-medium text-red-500">-{row.amount}</span> },
          { header: "Fee", cell: (row) => <span className="text-xs text-muted-foreground">{row.fee}</span> },
          { header: "Destination", cell: (row) => <span className="font-mono text-xs">{row.destination}</span> },
          { header: "Risk", cell: (row) => <StatusBadge status={row.risk} className={row.risk === 'HIGH' ? 'border-red-500 text-red-500' : ''} /> },
          { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          { header: "Requested", cell: (row) => <span className="text-xs text-muted-foreground">{format(new Date(row.date), 'MMM dd, HH:mm')}</span> },
          { 
            header: "Actions", 
            cell: (row) => row.status === "PENDING" || row.status === "REVIEWING" ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => { setSelected(row); setActionType("approve"); }}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => { setSelected(row); setActionType("reject"); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null
          }
        ]}
      />

      <ConfirmModal
        open={!!actionType}
        onOpenChange={(open) => !open && setActionType(null)}
        title={actionType === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
        description={
          actionType === "approve" 
            ? `Are you sure you want to approve this withdrawal of ${selected?.amount} ${selected?.asset}? This will broadcast the transaction to the network.`
            : `Are you sure you want to reject this withdrawal? Funds will be returned to the user's available balance.`
        }
        confirmText={actionType === "approve" ? "Approve" : "Reject"}
        variant={actionType === "approve" ? "default" : "destructive"}
        onConfirm={handleAction}
      >
        {selected?.risk === "HIGH" && actionType === "approve" && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md flex gap-2 items-start text-sm mb-4">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <p><strong>Warning:</strong> This withdrawal has been flagged as HIGH risk. Proceed with extreme caution.</p>
          </div>
        )}
        
        {actionType === "reject" && (
          <div className="space-y-3 mt-4">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Input 
              id="reason" 
              placeholder="e.g. Risk flagged, contact support"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
