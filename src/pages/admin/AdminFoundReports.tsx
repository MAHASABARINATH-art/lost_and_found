import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, PackageSearch, Archive, ArchiveRestore, Eye, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { FoundItem, Profile } from '@/types';
import { CATEGORIES as CATS } from '@/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, Select, LoadingPage, EmptyState, ItemImage, Button } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

interface FoundWithUser extends FoundItem {
  profiles: Pick<Profile, 'full_name' | 'email'> | null;
}

export default function AdminFoundReports() {
  const { profile } = useAuth();
  const [items, setItems] = useState<FoundWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error: queryError } = await supabase
        .from('found_items')
        .select('*, profiles:profiles(full_name, email)')
        .order('created_at', { ascending: false });
      if (queryError) {
        setError('Unable to load found reports. Please try again.');
        setLoading(false);
        return;
      }
      setItems((data || []) as FoundWithUser[]);
      setError('');
      setLoading(false);
    }
    load();
  }, []);

  const logAdminAction = async (actionType: string, targetId: string, desc: string) => {
    if (!profile) return;
    const { error: logError } = await supabase.from('admin_actions').insert({
      admin_id: profile.id,
      action_type: actionType,
      target_type: 'found_item',
      target_id: targetId,
      description: desc,
    });
    if (logError) {
      console.error('Failed to log admin action:', logError.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this report? It will be hidden from search results but can be restored later.')) return;
    const item = items.find((i) => i.id === id);
    const prevStatus = item?.status || 'Found';
    const { error: updateError } = await supabase
      .from('found_items')
      .update({ status: 'Archived', previous_status: prevStatus })
      .eq('id', id);
    if (updateError) {
      alert('Failed to archive report: ' + updateError.message);
      return;
    }
    setItems(items.map((i) => (i.id === id ? { ...i, status: 'Archived', previous_status: prevStatus } : i)));
    await logAdminAction('archive_report', id, `Archived found report: ${item?.item_name || id}`);
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Restore this report? It will become visible to users again.')) return;
    const item = items.find((i) => i.id === id);
    const restoreStatus = item?.previous_status || 'Found';
    const { error: updateError } = await supabase
      .from('found_items')
      .update({ status: restoreStatus, previous_status: null })
      .eq('id', id);
    if (updateError) {
      alert('Failed to restore report: ' + updateError.message);
      return;
    }
    setItems(items.map((i) => (i.id === id ? { ...i, status: restoreStatus as FoundItem['status'], previous_status: null } : i)));
    await logAdminAction('restore_report', id, `Restored found report: ${item?.item_name || id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this report?')) return;
    const { error: deleteError } = await supabase.from('found_items').delete().eq('id', id);
    if (deleteError) {
      alert('Failed to delete report: ' + deleteError.message);
      return;
    }
    setItems(items.filter((i) => i.id !== id));
  };

  const filtered = items.filter((item) => {
    if (search) {
      const kw = search.toLowerCase();
      if (!item.item_name.toLowerCase().includes(kw) && !item.location_found.toLowerCase().includes(kw)) return false;
    }
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    return true;
  });

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div>
        <PageHeader title="Found Reports" subtitle="View and manage all found item reports" />
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Found Reports" subtitle="View and manage all found item reports" />

      <Card className="p-4 mb-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item or location..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {CATS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Found">Found</option>
            <option value="Claimed">Claimed</option>
            <option value="Returned">Returned</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No found reports" message="No found item reports match your filters." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <ItemImage src={item.image_url} alt={item.item_name} className="w-full h-32 object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{item.item_name}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-slate-500">{item.location_found} · {formatDate(item.date_found)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Reported by {item.profiles?.full_name || 'Unknown'}</p>
                <div className="flex gap-2 mt-3">
                  <Link to={`/item/found/${item.id}`}>
                    <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> View</Button>
                  </Link>
                  {item.status === 'Archived' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)} className="text-green-600 hover:bg-green-50">
                      <ArchiveRestore className="w-4 h-4 mr-1" /> Restore
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleArchive(item.id)}>
                      <Archive className="w-4 h-4 mr-1" /> Archive
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
