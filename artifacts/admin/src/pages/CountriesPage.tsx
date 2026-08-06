import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Search, ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react';

interface Country {
  id: number;
  name: string;
  code: string;
  dial_code: string;
  flag_emoji: string | null;
  is_active: boolean;
  is_registration_allowed: boolean;
  updated_at: string;
}

export default function CountriesPage() {
  const { toast } = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [toggling, setToggling] = useState<Record<number, boolean>>({});

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/admin/countries');
      setCountries(res.data ?? []);
    } catch (err: any) {
      toast({ title: 'Failed to load countries', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCountries(); }, []);

  const filtered = useMemo(() => {
    return countries.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.dial_code.includes(search);
      const matchFilter =
        filter === 'all' ||
        (filter === 'active' && c.is_active) ||
        (filter === 'inactive' && !c.is_active);
      return matchSearch && matchFilter;
    });
  }, [countries, search, filter]);

  const stats = useMemo(() => ({
    total: countries.length,
    active: countries.filter((c) => c.is_active).length,
    inactive: countries.filter((c) => !c.is_active).length,
    registrationAllowed: countries.filter((c) => c.is_registration_allowed).length,
  }), [countries]);

  const toggleActive = async (country: Country) => {
    setToggling((prev) => ({ ...prev, [country.id]: true }));
    try {
      const res = await fetchApi(`/admin/countries/${country.id}/toggle-active`, { method: 'PATCH' });
      setCountries((prev) =>
        prev.map((c) => (c.id === country.id ? { ...c, is_active: res.data.is_active } : c))
      );
      toast({
        title: res.data.is_active ? '✅ Country Activated' : '🚫 Country Deactivated',
        description: `${country.name} is now ${res.data.is_active ? 'active' : 'inactive'}`,
      });
    } catch (err: any) {
      toast({ title: 'Toggle failed', description: err.message, variant: 'destructive' });
    } finally {
      setToggling((prev) => ({ ...prev, [country.id]: false }));
    }
  };

  const toggleRegistration = async (country: Country) => {
    setToggling((prev) => ({ ...prev, [country.id]: true }));
    try {
      const res = await fetchApi(`/admin/countries/${country.id}/toggle-registration`, { method: 'PATCH' });
      setCountries((prev) =>
        prev.map((c) =>
          c.id === country.id ? { ...c, is_registration_allowed: res.data.is_registration_allowed } : c
        )
      );
      toast({
        title: res.data.is_registration_allowed ? '✅ Registration Enabled' : '🚫 Registration Disabled',
        description: `${country.name} registration is now ${res.data.is_registration_allowed ? 'allowed' : 'blocked'}`,
      });
    } catch (err: any) {
      toast({ title: 'Toggle failed', description: err.message, variant: 'destructive' });
    } finally {
      setToggling((prev) => ({ ...prev, [country.id]: false }));
    }
  };

  const bulkToggle = async (isActive: boolean) => {
    const ids = filtered.map((c) => c.id);
    if (!ids.length) return;
    try {
      await fetchApi('/admin/countries/bulk-toggle', {
        method: 'POST',
        body: JSON.stringify({ ids, isActive }),
      });
      setCountries((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, is_active: isActive } : c))
      );
      toast({
        title: `${isActive ? '✅ Enabled' : '🚫 Disabled'} ${ids.length} countries`,
      });
    } catch (err: any) {
      toast({ title: 'Bulk toggle failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Country Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control which countries can access and register on Zebvix
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Countries</div>
          </CardContent>
        </Card>
        <Card className="border border-green-500/20 bg-green-500/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            <div className="text-xs text-muted-foreground mt-1">Active</div>
          </CardContent>
        </Card>
        <Card className="border border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">{stats.inactive}</div>
            <div className="text-xs text-muted-foreground mt-1">Inactive</div>
          </CardContent>
        </Card>
        <Card className="border border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.registrationAllowed}</div>
            <div className="text-xs text-muted-foreground mt-1">Registration Allowed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search country or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => bulkToggle(true)}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Enable All
          </Button>
          <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => bulkToggle(false)}>
            <ShieldOff className="h-4 w-4 mr-1" /> Disable All
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Showing {filtered.length} of {countries.length} countries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12">Flag</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="w-16">Code</TableHead>
                  <TableHead className="w-24">Dial Code</TableHead>
                  <TableHead className="text-center w-28">
                    <span className="flex items-center gap-1 justify-center">
                      <ShieldCheck className="h-3.5 w-3.5" /> Active
                    </span>
                  </TableHead>
                  <TableHead className="text-center w-36">
                    <span className="flex items-center gap-1 justify-center">
                      <UserCheck className="h-3.5 w-3.5" /> Registration
                    </span>
                  </TableHead>
                  <TableHead className="w-28 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted/50 rounded animate-pulse w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No countries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((country) => (
                    <TableRow key={country.id} className="border-border hover:bg-muted/30">
                      <TableCell className="text-xl">
                        {country.flag_emoji ?? '🏳'}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {country.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {country.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {country.dial_code}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={country.is_active}
                          disabled={toggling[country.id]}
                          onCheckedChange={() => toggleActive(country)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={country.is_registration_allowed}
                          disabled={toggling[country.id] || !country.is_active}
                          onCheckedChange={() => toggleRegistration(country)}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {country.is_active ? (
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
