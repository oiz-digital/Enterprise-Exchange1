import { useParams } from "wouter";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ShieldAlert, Ban, CheckCircle } from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MOCK_USER = {
  id: "USR-1004",
  email: "user4@example.com",
  firstName: "James",
  lastName: "Holden",
  mobile: "+1 555 0104",
  accountStatus: "ACTIVE",
  kycStatus: "APPROVED",
  createdAt: "2023-08-14T10:00:00Z",
  lastLogin: "2023-10-24T08:30:00Z",
  ipAddress: "192.168.1.1",
  twoFactorEnabled: true,
  riskLevel: "LOW"
};

export default function UserDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [user, setUser] = useState(MOCK_USER); // Mock state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleSuspend = () => {
    setUser({ ...user, accountStatus: "SUSPENDED" });
    setSuspendModalOpen(false);
    toast({ title: "User Suspended", description: `Reason: ${reason}` });
    setReason("");
  };

  const handleReactivate = () => {
    setUser({ ...user, accountStatus: "ACTIVE" });
    toast({ title: "User Reactivated", description: "Account is now fully active." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{user.firstName} {user.lastName}</h1>
            <StatusBadge status={user.accountStatus} />
            <StatusBadge status={user.kycStatus} />
          </div>
          <p className="text-muted-foreground text-sm">{user.email} • ID: {id}</p>
        </div>
        <div className="flex gap-2">
          {user.accountStatus === "ACTIVE" ? (
            <Button variant="destructive" onClick={() => setSuspendModalOpen(true)}>
              <Ban className="h-4 w-4 mr-2" /> Suspend
            </Button>
          ) : (
            <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleReactivate}>
              <CheckCircle className="h-4 w-4 mr-2" /> Reactivate
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-card border border-border w-full justify-start rounded-none rounded-t-lg h-auto p-0 overflow-x-auto">
          {["Profile", "KYC", "Wallets", "Deposits", "Withdrawals", "Orders", "Trades", "Sessions", "Security", "Risk"].map((tab) => (
            <TabsTrigger 
              key={tab.toLowerCase()} 
              value={tab.toLowerCase()}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">First Name</div>
                    <div className="font-medium">{user.firstName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Last Name</div>
                    <div className="font-medium">{user.lastName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Email Address</div>
                    <div className="font-medium">{user.email}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Mobile Number</div>
                    <div className="font-medium">{user.mobile}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Created At</div>
                    <div className="font-medium">{format(new Date(user.createdAt), 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Last Login</div>
                    <div className="font-medium">{format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">2FA Status</div>
                    <div className="font-medium flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${user.twoFactorEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Risk Level</div>
                    <div className="font-medium"><StatusBadge status={user.riskLevel} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kyc" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>KYC Application</CardTitle>
              <CardDescription>Identity verification documents and status.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground text-sm">
                No active KYC application or data is already approved.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Placeholder for other tabs */}
        {["wallets", "deposits", "withdrawals", "orders", "trades", "sessions", "security", "risk"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Data for {tab} will load here. (Mocked empty state)
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmModal
        open={suspendModalOpen}
        onOpenChange={setSuspendModalOpen}
        title="Suspend User Account"
        description={`Are you sure you want to suspend ${user.email}? This will immediately prevent them from logging in, trading, or withdrawing funds.`}
        confirmText="Suspend Account"
        variant="destructive"
        onConfirm={handleSuspend}
      >
        <div className="space-y-3 mt-4">
          <Label htmlFor="reason">Reason for suspension (Required)</Label>
          <Input 
            id="reason" 
            placeholder="e.g. Terms of Service violation, Fraud suspicion"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
