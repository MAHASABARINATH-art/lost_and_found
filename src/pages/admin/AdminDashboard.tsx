import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  PackageSearch,
  ShieldCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
  Package,
  ArrowRight,
  AlertCircle,
  Archive,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/AppLayout';
import { Card, LoadingPage } from '@/components/ui';

interface Stats {
  totalUsers: number;
  lostReports: number;
  foundReports: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  returnedItems: number;
  completedCases: number;
  archivedLost: number;
  archivedFound: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentClaims, setRecentClaims] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [users, lost, found, pending, approved, rejected, returned, completed, claims, archLost, archFound] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
          supabase.from('lost_items').select('*', { count: 'exact', head: true }).neq('status', 'Archived'),
          supabase.from('found_items').select('*', { count: 'exact', head: true }).neq('status', 'Archived'),
          supabase.from('claims').select('*', { count: 'exact', head: true }).in('status', ['Claim Submitted', 'Under Review']),
          supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
          supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
          supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'Returned'),
          supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
          supabase
            .from('claims')
            .select(`id, status, created_at, found_item:found_items(item_name)`)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('lost_items').select('*', { count: 'exact', head: true }).eq('status', 'Archived'),
          supabase.from('found_items').select('*', { count: 'exact', head: true }).eq('status', 'Archived'),
        ]);

      const failed = [users, lost, found, pending, approved, rejected, returned, completed, claims, archLost, archFound].filter((r) => r.error);
      if (failed.length > 0) {
        setError('Unable to load dashboard statistics. Please try again.');
        setLoading(false);
        return;
      }

      setStats({
        totalUsers: users.count || 0,
        lostReports: lost.count || 0,
        foundReports: found.count || 0,
        pendingClaims: pending.count || 0,
        approvedClaims: approved.count || 0,
        rejectedClaims: rejected.count || 0,
        returnedItems: returned.count || 0,
        completedCases: completed.count || 0,
        archivedLost: archLost.count || 0,
        archivedFound: archFound.count || 0,
      });
      setRecentClaims(claims.data || []);
      setError('');
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div>
        <PageHeader title="Admin Dashboard" subtitle="System overview and quick access to management tools" />
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const archivedTotal = (stats?.archivedLost || 0) + (stats?.archivedFound || 0);

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, to: '/admin/users' },
    { label: 'Lost Reports', value: stats?.lostReports || 0, icon: FileText, to: '/admin/lost-reports' },
    { label: 'Found Reports', value: stats?.foundReports || 0, icon: PackageSearch, to: '/admin/found-reports' },
    { label: 'Pending Claims', value: stats?.pendingClaims || 0, icon: ShieldCheck, to: '/admin/claims' },
    { label: 'Approved', value: stats?.approvedClaims || 0, icon: CheckCircle, to: '/admin/claims' },
    { label: 'Rejected', value: stats?.rejectedClaims || 0, icon: XCircle, to: '/admin/claims' },
    { label: 'Returned', value: stats?.returnedItems || 0, icon: Package, to: '/admin/claims' },
    { label: 'Completed', value: stats?.completedCases || 0, icon: TrendingUp, to: '/admin/claims' },
    { label: 'Archived', value: archivedTotal, icon: Archive, to: '/admin/archived-reports' },
  ];

  const quickActions = [
    { label: 'Review Claims', desc: 'Approve or reject pending claims', to: '/admin/claims', icon: ShieldCheck },
    { label: 'Lost Reports', desc: 'View all lost item reports', to: '/admin/lost-reports', icon: FileText },
    { label: 'Found Reports', desc: 'View all found item reports', to: '/admin/found-reports', icon: PackageSearch },
    { label: 'Manage Users', desc: 'View and manage user accounts', to: '/admin/users', icon: Users },
    { label: 'Archived Reports', desc: 'View and restore archived reports', to: '/admin/archived-reports', icon: Archive },
  ];

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System overview and quick access to management tools" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to} className="group">
              <Card className="p-4 group-hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900 leading-tight">{card.value}</p>
                    <p className="text-xs text-slate-500 truncate">{card.label}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} to={action.to} className="group">
              <Card className="p-4 group-hover:shadow-md transition-shadow h-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                    <Icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm">{action.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 shrink-0 ml-auto transition-colors" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent claims */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Claims</h2>
      <Card className="overflow-hidden">
        {recentClaims.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No claims yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentClaims.map((claim) => (
              <Link
                key={claim.id}
                to="/admin/claims"
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-medium text-slate-900 text-sm">
                    {claim.found_item?.item_name || 'Unknown item'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(claim.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    claim.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    claim.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    claim.status === 'Returned' ? 'bg-amber-100 text-amber-700' :
                    claim.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {claim.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
