import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import UsersPage from '@/pages/UsersPage';
import UserDetailPage from '@/pages/UserDetailPage';
import KycPage from '@/pages/KycPage';
import AssetsPage from '@/pages/AssetsPage';
import NetworksPage from '@/pages/NetworksPage';
import MarketsPage from '@/pages/MarketsPage';
import WalletsPage from '@/pages/WalletsPage';
import DepositsPage from '@/pages/DepositsPage';
import WithdrawalsPage from '@/pages/WithdrawalsPage';
import OrdersPage from '@/pages/OrdersPage';
import TradesPage from '@/pages/TradesPage';
import StakingPage from '@/pages/StakingPage';
import P2pPage from '@/pages/P2pPage';
import ReferralsPage from '@/pages/ReferralsPage';
import FeesPage from '@/pages/FeesPage';
import RiskPage from '@/pages/RiskPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ReportsPage from '@/pages/ReportsPage';
import AdminsPage from '@/pages/AdminsPage';
import RolesPage from '@/pages/RolesPage';
import AuditPage from '@/pages/AuditPage';
import SettingsPage from '@/pages/SettingsPage';
import CountriesPage from '@/pages/CountriesPage';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/users" component={UsersPage} />
        <Route path="/users/:id" component={UserDetailPage} />
        <Route path="/kyc" component={KycPage} />
        <Route path="/assets" component={AssetsPage} />
        <Route path="/networks" component={NetworksPage} />
        <Route path="/markets" component={MarketsPage} />
        <Route path="/wallets" component={WalletsPage} />
        <Route path="/deposits" component={DepositsPage} />
        <Route path="/withdrawals" component={WithdrawalsPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/trades" component={TradesPage} />
        <Route path="/staking" component={StakingPage} />
        <Route path="/p2p" component={P2pPage} />
        <Route path="/referrals" component={ReferralsPage} />
        <Route path="/fees" component={FeesPage} />
        <Route path="/risk" component={RiskPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/admins" component={AdminsPage} />
        <Route path="/roles" component={RolesPage} />
        <Route path="/audit" component={AuditPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/countries" component={CountriesPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="*">
                <ProtectedRoute>
                  <ProtectedRouter />
                </ProtectedRoute>
              </Route>
            </Switch>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
