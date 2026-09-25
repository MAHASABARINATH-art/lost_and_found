import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ChevronRight, FileText, PackageSearch } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Match, LostItem, FoundItem } from '@/types';
import { PageHeader } from '@/components/AppLayout';
import { Card, LoadingPage, EmptyState, ItemImage } from '@/components/ui';

interface MatchWithItems extends Match {
  lost_item: LostItem;
  found_item: FoundItem;
}

export default function MatchesPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<MatchWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    async function load() {
      // Get user's lost items
      const { data: lostItems } = await supabase
        .from('lost_items')
        .select('id')
        .eq('user_id', profile!.id);
      if (!lostItems || lostItems.length === 0) {
        setLoading(false);
        return;
      }
      const lostIds = lostItems.map((l) => l.id);
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          *,
          lost_item:lost_items(*),
          found_item:found_items(*)
        `)
        .in('lost_item_id', lostIds)
        .order('match_score', { ascending: false });
      setMatches((matchData || []) as MatchWithItems[]);
      setLoading(false);
    }
    load();
  }, [profile]);

  if (loading) return <LoadingPage />;

  return (
    <div>
      <PageHeader
        title="Possible Matches"
        subtitle="Items that may match your lost reports. A match does not prove ownership — admin verifies all claims."
      />

      {matches.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No matches found"
          message="When someone reports a found item that matches your lost report, it will appear here."
          action={
            <Link to="/report-lost" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700">
              Report a Lost Item
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id} className="p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Score */}
                <div className="flex lg:flex-col items-center justify-center gap-2 lg:w-24 shrink-0">
                  <div className={`text-3xl font-bold ${
                    match.match_score >= 70 ? 'text-green-600' : match.match_score >= 50 ? 'text-amber-600' : 'text-slate-600'
                  }`}>
                    {match.match_score}%
                  </div>
                  <div className="text-xs text-slate-400 font-medium">match</div>
                </div>

                {/* Items */}
                <div className="flex-1 grid sm:grid-cols-2 gap-4">
                  {/* Lost item */}
                  <Link to={`/item/lost/${match.lost_item.id}`} className="group">
                    <div className="flex gap-3">
                      <ItemImage src={match.lost_item.image_url} alt={match.lost_item.item_name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-0.5">
                          <FileText className="w-3.5 h-3.5" /> Lost
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600">{match.lost_item.item_name}</h4>
                        <p className="text-xs text-slate-500 truncate">{match.lost_item.location_lost}</p>
                        <p className="text-xs text-slate-400">{match.lost_item.date_lost}</p>
                      </div>
                    </div>
                  </Link>

                  {/* Found item */}
                  <Link to={`/item/found/${match.found_item.id}`} className="group">
                    <div className="flex gap-3">
                      <ItemImage src={match.found_item.image_url} alt={match.found_item.item_name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-0.5">
                          <PackageSearch className="w-3.5 h-3.5" /> Found
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm truncate group-hover:text-emerald-600">{match.found_item.item_name}</h4>
                        <p className="text-xs text-slate-500 truncate">{match.found_item.location_found}</p>
                        <p className="text-xs text-slate-400">{match.found_item.date_found}</p>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Reasons */}
                {match.matching_reasons && (
                  <div className="lg:w-56 shrink-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Match reasons</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matching_reasons.split(';').map((reason, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {reason.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end">
                <Link
                  to={`/item/found/${match.found_item.id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
                >
                  View Found Item <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
