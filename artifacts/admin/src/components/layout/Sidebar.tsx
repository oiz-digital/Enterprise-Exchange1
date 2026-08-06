import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Wallet,
  Network,
  BarChart2,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ListOrdered,
  Activity,
  Layers,
  Users2,
  Gift,
  DollarSign,
  FileText,
  AlertTriangle,
  Bell,
  Shield,
  History,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const SIDEBAR_ITEMS = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Users",
    items: [
      { name: "Users", href: "/users", icon: Users },
      { name: "KYC", href: "/kyc", icon: ShieldCheck },
    ],
  },
  {
    title: "Exchange",
    items: [
      { name: "Assets", href: "/assets", icon: Wallet },
      { name: "Networks", href: "/networks", icon: Network },
      { name: "Markets", href: "/markets", icon: BarChart2 },
      { name: "Wallets", href: "/wallets", icon: ArrowRightLeft },
    ],
  },
  {
    title: "Funds",
    items: [
      { name: "Deposits", href: "/deposits", icon: ArrowDownToLine },
      { name: "Withdrawals", href: "/withdrawals", icon: ArrowUpFromLine },
    ],
  },
  {
    title: "Trading",
    items: [
      { name: "Orders", href: "/orders", icon: ListOrdered },
      { name: "Trades", href: "/trades", icon: Activity },
    ],
  },
  {
    title: "Products",
    items: [
      { name: "Staking", href: "/staking", icon: Layers },
      { name: "P2P", href: "/p2p", icon: Users2 },
      { name: "Referrals", href: "/referrals", icon: Gift },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Fees", href: "/fees", icon: DollarSign },
      { name: "Reports", href: "/reports", icon: FileText },
    ],
  },
  {
    title: "Risk",
    items: [
      { name: "Risk Flags", href: "/risk", icon: AlertTriangle },
    ],
  },
  {
    title: "System",
    items: [
      { name: "Notifications", href: "/notifications", icon: Bell },
      { name: "Admins", href: "/admins", icon: Shield },
      { name: "Roles", href: "/roles", icon: ShieldCheck },
      { name: "Audit Logs", href: "/audit", icon: History },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { admin, logout } = useAuth();
  
  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 text-sidebar-primary">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 22 2 12 22z" />
            </svg>
          </div>
          <span className="font-bold tracking-wide text-lg text-sidebar-foreground">ZEBVIX</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {SIDEBAR_ITEMS.map((group, i) => (
          <div key={i} className="mb-6 last:mb-0">
            <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-3">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href} className="block">
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-primary font-semibold relative after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-5 after:w-1 after:bg-sidebar-primary after:rounded-r-full"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}>
                      <Icon className={cn("h-4 w-4", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-sidebar-border p-4 shrink-0 bg-sidebar">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium text-sidebar-primary uppercase border border-sidebar-border">
              {admin?.email?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate text-sidebar-foreground">{admin?.email || 'Admin'}</span>
              <span className="text-xs text-sidebar-foreground/50 truncate uppercase">{admin?.roles?.[0] || 'SUPER_ADMIN'}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/60 hover:text-destructive transition-colors w-full px-1 py-1.5 rounded"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}