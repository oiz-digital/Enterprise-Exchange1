import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function UsersPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [kycFilter, setKycFilter] = useState("ALL");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', debouncedSearchTerm, statusFilter, kycFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (kycFilter !== "ALL") params.append("kyc", kycFilter);
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      
      const res = await fetchApi<any>(`/admin/users?${params.toString()}`);
      return res;
    }
  });

  const usersData = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20 };
  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage user accounts, statuses, and profiles." />

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Email or User ID" 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2"><Filter className="h-4 w-4"/> <SelectValue placeholder="Status" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="RESTRICTED">Restricted</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kycFilter} onValueChange={setKycFilter}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2"><Filter className="h-4 w-4"/> <SelectValue placeholder="KYC" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All KYC</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="UNVERIFIED">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <div className="text-red-500 bg-red-50 p-4 rounded-lg mb-4">Failed to load users data.</div>}
      
      <DataTable 
        isLoading={isLoading}
        data={usersData}
        onRowClick={(row) => setLocation(`/users/${row.id}`)}
        columns={[
          { 
            header: "User", 
            cell: (row) => (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium text-xs">
                  {row.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{row.email}</div>
                  <div className="text-xs text-muted-foreground">{row.id}</div>
                </div>
              </div>
            ) 
          },
          { header: "Mobile", cell: (row) => <span className="text-sm text-muted-foreground">{row.mobile || "—"}</span> },
          { header: "Account Status", cell: (row) => <StatusBadge status={row.status} /> },
          { header: "KYC Status", cell: (row) => <StatusBadge status={row.kyc_status} /> },
          { header: "Joined", cell: (row) => <span className="text-sm text-muted-foreground">{format(new Date(row.created_at), 'MMM dd, yyyy')}</span> },
          { 
            header: "Actions", 
            cell: () => (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )
          }
        ]}
      />
      
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
