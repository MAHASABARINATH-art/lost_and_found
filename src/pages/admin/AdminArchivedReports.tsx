import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Archive, ArchiveRestore, Eye, AlertCircle, FileText, PackageSearch } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { LostItem, FoundItem, Profile } from '@/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, LoadingPage, EmptyState, ItemImage, Button } from '@/components/ui';

interface ArchivedLost extends LostItem {
  profiles: Pick<Profile, 'full_name' | 'email'> | null;
}
interface ArchivedFound extends FoundItem {
  profiles: Pick<Profile, 'full_name' | 'email'> | null;
}

export default function AdminArchivedReports() {
  const { profile } = useAuth();
  const [lostItems, setLostItems] = useState<ArchivedLost[]>([]);
  const [foundItems, setFoundItems] = useState<ArchivedFound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'lost' | 'found'>('lost');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const [lost, found] = await Promise.all([
        supabase
          .from('lost_items')
          .select('*, profiles:profiles(full_name, email)')
          .eq('status', 'Archived')
          .order('updated_at', { ascending: false }),
        supabase
          .from('found_items')
          .select('*, profiles:profiles(full_name, email)')
          .eq('status', 'Archived')
          .order('updated_at', { ascending: false }),
      ]);

      if (lost.error || found.error) {
        setError('Unable to load archived reports. Please try again.');
        setLoading(false);
        return;
      }

      setLostItems((lost.data || []) as ArchivedLost[]);
      setFoundItems((found.data || []) as ArchivedFound[]);
      setError('');
      setLoading(false);
    }
    load();
  }, []);

  const logAdminAction = async (actionType: string, targetType: string, targetId: string, desc: string) => {
    if (!profile) return;
    const { error: logError } = await supabase.from('admin_actions').insert({
      admin_id: profile.id,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      description: desc,
    });
    if (logError) {
      console.error('Failed to log admin action:', logError.message);
    }
  };

  const handleRestoreLost = async (id: string) => {
    if (!confirm('Restore this lost report? It will become visible to users again.')) return;
    const item = lostItems.find((i) => i.id === id);
    const restoreStatus = item?.previous_status || 'Lost';
    const { error: updateError } = await supabase
      .from('lost_items')
      .update({ status: restoreStatus, previous_status: null })
      .eq('id', id);
    if (updateError) {
      alert('Failed to restore report: ' + updateError.message);
      return;
    }
    setLostItems(lostItems.filter((i) => i.id !== id));
    await logAdminAction('restore_report', 'lost_item', id, `Restored lost report: ${item?.item_name || id}`);
  };

  const handleRestoreFound = async (id: string) => {
    if (!confirm('Restore this found report? It will become visible to users again.')) return;
    const item = foundItems.find((i) => i.id === id);
    const restoreStatus = item?.previous_status || 'Found';
    const { error: updateError } = await supabase
      .from('found_items')
      .update({ status: restoreStatus, previous_status: null })
      .eq('id', id);
    if (updateError) {
      alert('Failed to restore report: ' + updateError.message);
      return;
    }
    setFoundItems(foundItems.filter((i) => i.id !== id));
    await logAdminAction('restore_report', 'found_item', id, `Restored found report: ${item?.item_name || id}`);
  };

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div>
        <PageHeader title="Archived Reports" subtitle="View and restore archived lost and found reports" />
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const items = tab === 'lost' ? lostItems : foundItems;

  const filtered = items.filter((item) => {
    if (!search) return true;
    const kw = search.toLowerCase();
    const name = item.item_name.toLowerCase();
    const location = tab === 'lost' ? (item as ArchivedLost).location_lost : (item as ArchivedFound).location_found;
    const reporter = item.profiles?.full_name?.toLowerCase() || '';
    return name.includes(kw) || location.toLowerCase().includes(kw) || reporter.includes(kw);
  });

  return (
    <div>
      <PageHeader title="Archived Reports" subtitle="View and restore archived lost and found reports" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('lost')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            tab === 'lost' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" /> Archived Lost ({lostItems.length})
        </button>
        <button
          onClick={() => setTab('found')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            tab === 'found' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PackageSearch className="w-4 h-4" /> Archived Found ({foundItems.length})
        </button>
      </div>

      {/* Search */}
      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item name, location, or reporter..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={`No archived ${tab} reports`}
          message={`There are no archived ${tab} item reports${search ? ' matching your search' : ''}.`}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isLost = tab === 'lost';
            const location = isLost ? (item as ArchivedLost).location_lost : (item as ArchivedFound).location_found;
            const date = isLost ? (item as ArchivedLost).date_lost : (item as ArchivedFound).date_found;
            return (
              <Card key={item.id} className="overflow-hidden">
                <ItemImage src={item.image_url} alt={item.item_name} className="w-full h-32 object-cover" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm">{item.item_name}</h3>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-100 text-gray-500 border-gray-200">
                      Archived
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{location} · {formatDate(date)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Reported by {item.profiles?.full_name || 'Unknown'}</p>
                  {item.previous_status && (
                    <p className="text-xs text-slate-400 mt-0.5">Previous status: {item.previous_status}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">Archived on {formatDate(item.updated_at)}</p>
                  <div className="flex gap-2 mt-3">
                    <Link to={`/item/${isLost ? 'lost' : 'found'}/${item.id}`}>
                      <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> View</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => isLost ? handleRestoreLost(item.id) : handleRestoreFound(item.id)}
                      className="text-green-600 hover:bg-green-50"
                    >
                      <ArchiveRestore className="w-4 h-4 mr-1" /> Restore
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
