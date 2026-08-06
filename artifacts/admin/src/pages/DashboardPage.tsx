import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { fetchApi } from "@/lib/api/client";
import { Users, Activity, ShieldAlert, ArrowDownToLine, ArrowUpFromLine, LineChart, Coins, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";

type RecentUser = {
  id: string;
  email: string;
  status: string;
  kyc: string;
  created: string;
};

type RiskAlert = {
  id: string;
  user: string;
  type: string;
  severity: string;
  status: string;
};

// Mock data removed

const recentUserColumns: Column<any>[] = [
  { header: "User", accessorKey: "email" },
  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { header: "KYC", cell: (row) => <StatusBadge status={row.kyc_status} /> },
  {
    header: "Joined",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {format(new Date(row.created_at), "MMM dd, HH:mm")}
      </span>
    ),
  },
];

const riskAlertColumns: Column<any>[] = [
  { header: "Code", cell: (row) => <span className="font-medium">{row.code}</span> },
  { header: "Description", cell: (row) => <span className="text-xs text-muted-foreground">{row.description}</span> },
  { header: "Severity", cell: (row) => <StatusBadge status={row.severity} /> },
  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const res = await fetchApi<any>('/admin/dashboard');
        return res;
      } catch (err) {
        throw err;
      }
    }
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Failed to load dashboard data.</div>;
  }

  if (isLoading || !data) {
    return <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 bg-card rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length:8}).map((_,i) => <div key={i} className="h-28 bg-card rounded"></div>)}
      </div>
    </div>;
  }

  const { users, orders, trades, deposits, withdrawals, kyc, recentUsers, riskAlerts, volumeChart } = data;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Exchange Overview" description="Real-time metrics and system status." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={users?.total?.toLocaleString() || 0} icon={Users} />
        <StatsCard title="Active Users (24h)" value={users?.active?.toLocaleString() || 0} icon={Activity} />
        <StatsCard title="Pending KYC" value={(kyc?.pending || 0) + (kyc?.under_review || 0)} icon={ShieldAlert} className="border-amber-500/20" />
        <StatsCard title="Open Orders" value={orders?.open?.toLocaleString() || 0} icon={LineChart} />
        
        <StatsCard title="24h Volume" value={formatCurrency(trades?.volume_24h || 0)} icon={BarChart3} />
        <StatsCard title="24h Deposits" value={formatCurrency(deposits?.volume_24h || 0)} icon={ArrowDownToLine} />
        <StatsCard title="24h Withdrawals" value={formatCurrency(withdrawals?.volume_24h || 0)} icon={ArrowUpFromLine} />
        <StatsCard title="24h Fees" value={formatCurrency(0)} icon={Coins} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trading Volume (7d)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={volumeChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => format(new Date(v), 'MMM dd')} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000000}M`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="volume" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Fee Revenue (7d)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeChart || []}>
                <defs>
                  <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => format(new Date(v), 'MMM dd')} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="trades" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorFees)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <DataTable data={recentUsers as RecentUser[]} columns={recentUserColumns} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Active Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <DataTable data={riskAlerts as RiskAlert[]} columns={riskAlertColumns} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
