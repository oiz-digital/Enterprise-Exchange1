import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Mock Data
const MOCK_KYC = [
  { id: "KYC-001", user: "user1@example.com", name: "Alice Smith", country: "US", docType: "PASSPORT", submitted: new Date().toISOString(), status: "PENDING" },
  { id: "KYC-002", user: "user2@example.com", name: "Bob Johnson", country: "UK", docType: "DRIVERS_LICENSE", submitted: new Date(Date.now()-86400000).toISOString(), status: "UNDER_REVIEW" },
  { id: "KYC-003", user: "user3@example.com", name: "Charlie Brown", country: "CA", docType: "ID_CARD", submitted: new Date(Date.now()-172800000).toISOString(), status: "APPROVED" },
];

export default function KycPage() {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const filteredData = MOCK_KYC.filter(k => k.status === activeTab);

  const handleAction = (action: string) => {
    toast({ title: `KYC ${action}`, description: `Action processed for ${selectedKyc?.name}` });
    setSelectedKyc(null);
    setReason("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="KYC Management" description="Review and process user identity verifications." />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="UNDER_REVIEW">Under Review</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <DataTable 
            data={filteredData}
            columns={[
              { header: "User", accessorKey: "user" },
              { header: "Name", accessorKey: "name", className: "font-medium" },
              { header: "Country", accessorKey: "country" },
              { header: "Document", accessorKey: "docType" },
              { header: "Submitted", cell: (row) => <span className="text-sm text-muted-foreground">{format(new Date(row.submitted), 'MMM dd, HH:mm')}</span> },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              { 
                header: "Actions", 
                cell: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedKyc(row)}>
                    <Eye className="h-4 w-4 mr-2" /> Review
                  </Button>
                )
              }
            ]}
          />
        </div>
      </Tabs>

      <Dialog open={!!selectedKyc} onOpenChange={(open) => !open && setSelectedKyc(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review KYC Application</DialogTitle>
            <DialogDescription>{selectedKyc?.user}</DialogDescription>
          </DialogHeader>
          {selectedKyc && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                <div><div className="text-muted-foreground">Full Name</div><div className="font-medium">{selectedKyc.name}</div></div>
                <div><div className="text-muted-foreground">Country</div><div className="font-medium">{selectedKyc.country}</div></div>
                <div><div className="text-muted-foreground">Document Type</div><div className="font-medium">{selectedKyc.docType}</div></div>
                <div><div className="text-muted-foreground">Status</div><div className="font-medium"><StatusBadge status={selectedKyc.status} /></div></div>
              </div>

              <div className="h-48 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground">
                Document Images (Front/Back/Selfie) - Simulated View
              </div>

              {selectedKyc.status !== "APPROVED" && (
                <div className="space-y-2">
                  <Label>Reason (Required for Reject / Request Resubmission)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason..." />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedKyc(null)}>Cancel</Button>
            {selectedKyc?.status !== "APPROVED" && (
              <>
                <Button variant="secondary" onClick={() => handleAction("Request Resubmission")}>Request Resubmission</Button>
                <Button variant="destructive" onClick={() => handleAction("Rejected")}>Reject</Button>
                <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction("Approved")}>Approve</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
