import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Claim } from '@/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, LoadingPage, EmptyState } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

export default function MyClaimsPage() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select(`
          *,
          found_item:found_items(*)
        `)
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false });
      setClaims((data || []) as Claim[]);
      setLoading(false);
    }
    load();
  }, [profile]);

  if (loading) return <LoadingPage />;

  return (
    <div>
      <PageHeader title="My Claims" subtitle="Track the status of claims you've submitted" />

      {claims.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No claims yet"
          message="When you submit a claim for a found item, it will appear here."
          action={
            <Link to="/search" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700">
              Search Items
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              to={`/my-claims/${claim.id}`}
              className="block group"
            >
              <Card className="p-4 group-hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {claim.found_item?.item_name || 'Unknown item'}
                    </h3>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                      <span>Submitted {formatDate(claim.created_at)}</span>
                      <span className="hidden sm:inline">·</span>
                      <span>Updated {formatDate(claim.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <StatusBadge status={claim.status} />
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  </div>
                </div>
                {claim.status === 'Rejected' && claim.admin_reason && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{claim.admin_reason}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
