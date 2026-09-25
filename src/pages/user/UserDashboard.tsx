import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageSearch,
  PlusCircle,
  FileText,
  ShieldCheck,
  Bell,
  Search,
  TrendingUp,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/AppLayout';
import { Card, LoadingPage } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface Stats {
  lostReports: number;
  foundReports: number;
  activeClaims: number;
  completedReturns: number;
}

interface RecentItem {
  id: string;
  item_name: string;
  status: string;
  created_at: string;
  type: 'lost' | 'found';
}

export default function UserDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const userId = profile.id;
    async function load() {
      const [lost, found, active, completed, recentLost, recentFound] = await Promise.all([
        supabase.from('lost_items').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'Archived'),
        supabase.from('found_items').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'Archived'),
        supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['Claim Submitted', 'Under Review', 'Approved']),
        supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['Returned', 'Completed']),
        supabase.from('lost_items').select('id, item_name, status, created_at').eq('user_id', userId).neq('status', 'Archived').order('created_at', { ascending: false }).limit(3),
        supabase.from('found_items').select('id, item_name, status, created_at').eq('user_id', userId).neq('status', 'Archived').order('created_at', { ascending: false }).limit(3),
      ]);

      setStats({
        lostReports: lost.count || 0,
        foundReports: found.count || 0,
        activeClaims: active.count || 0,
        completedReturns: completed.count || 0,
      });

      const lostRecent: RecentItem[] = (recentLost.data || []).map((i) => ({ ...i, type: 'lost' as const }));
      const foundRecent: RecentItem[] = (recentFound.data || []).map((i) => ({ ...i, type: 'found' as const }));
      const combined = [...lostRecent, ...foundRecent].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5);
      setRecentItems(combined);

      setLoading(false);
    }
    load();
  }, [profile]);

  if (loading) return <LoadingPage />;

  const statsList = [
    { label: 'Lost Reports', value: stats?.lostReports || 0, icon: FileText, to: '/my-reports' },
    { label: 'Found Reports', value: stats?.foundReports || 0, icon: PackageSearch, to: '/my-reports' },
    { label: 'Active Claims', value: stats?.activeClaims || 0, icon: ShieldCheck, to: '/my-claims' },
    { label: 'Completed', value: stats?.completedReturns || 0, icon: CheckCircle, to: '/my-claims' },
  ];

  const actions = [
    { label: 'Report Lost Item', desc: 'Report something you lost', icon: PlusCircle, to: '/report-lost' },
    { label: 'Report Found Item', desc: 'Report something you found', icon: PackageSearch, to: '/report-found' },
    { label: 'Search Items', desc: 'Search lost & found items', icon: Search, to: '/search' },
    { label: 'View Matches', desc: 'See possible matches', icon: TrendingUp, to: '/matches' },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile?.full_name.split(' ')[0]}`}
        subtitle="Here's your Lost & Found activity overview"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statsList.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.to} className="group">
              <Card className="p-4 group-hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900 leading-tight">{stat.value}</p>
                    <p className="text-xs text-slate-500 truncate">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {actions.map((action) => {
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
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent reports */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Reports</h2>
      <Card className="overflow-hidden">
        {recentItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500 mb-3">You haven't reported any items yet.</p>
            <Link to="/report-lost" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              Report your first item <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentItems.map((item) => (
              <Link
                key={item.type + item.id}
                to={`/item/${item.type}/${item.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'lost' ? 'bg-blue-50' : 'bg-emerald-50'
                  }`}>
                    {item.type === 'lost' ? (
                      <FileText className="w-4 h-4 text-blue-600" />
                    ) : (
                      <PackageSearch className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{item.item_name}</p>
                    <p className="text-xs text-slate-500">
                      {item.type === 'lost' ? 'Lost' : 'Found'} · {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    item.status === 'Lost' ? 'bg-blue-100 text-blue-700' :
                    item.status === 'Found' ? 'bg-emerald-100 text-emerald-700' :
                    item.status === 'Returned' ? 'bg-amber-100 text-amber-700' :
                    item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {item.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
