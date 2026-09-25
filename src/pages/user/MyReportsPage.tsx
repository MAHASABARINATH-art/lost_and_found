import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PackageSearch, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { LostItem, FoundItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, LoadingPage, EmptyState, ItemImage, Button } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

export default function MyReportsPage() {
  const { profile } = useAuth();
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'lost' | 'found'>('lost');

  useEffect(() => {
    if (!profile) return;
    async function load() {
      const [lost, found] = await Promise.all([
        supabase.from('lost_items').select('*').eq('user_id', profile!.id).neq('status', 'Archived').order('created_at', { ascending: false }),
        supabase.from('found_items').select('*').eq('user_id', profile!.id).neq('status', 'Archived').order('created_at', { ascending: false }),
      ]);
      setLostItems((lost.data || []) as LostItem[]);
      setFoundItems((found.data || []) as FoundItem[]);
      setLoading(false);
    }
    load();
  }, [profile]);

  const handleDelete = async (id: string, type: 'lost' | 'found') => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    const table = type === 'lost' ? 'lost_items' : 'found_items';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      if (type === 'lost') setLostItems(lostItems.filter((i) => i.id !== id));
      else setFoundItems(foundItems.filter((i) => i.id !== id));
    }
  };

  if (loading) return <LoadingPage />;

  const items = tab === 'lost' ? lostItems : foundItems;

  return (
    <div>
      <PageHeader title="My Reports" subtitle="View and manage your lost and found reports" />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('lost')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            tab === 'lost' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" /> Lost Reports ({lostItems.length})
        </button>
        <button
          onClick={() => setTab('found')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            tab === 'found' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PackageSearch className="w-4 h-4" /> Found Reports ({foundItems.length})
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={tab === 'lost' ? FileText : PackageSearch}
          title={`No ${tab} reports`}
          message={`You haven't reported any ${tab} items yet.`}
          action={
            <Link to={tab === 'lost' ? '/report-lost' : '/report-found'} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700">
              {tab === 'lost' ? 'Report Lost Item' : 'Report Found Item'}
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <ItemImage src={item.image_url} alt={item.item_name} className="w-full h-32 object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{item.item_name}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-slate-500">
                  {tab === 'lost' ? (item as LostItem).location_lost : (item as FoundItem).location_found}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(tab === 'lost' ? (item as LostItem).date_lost : (item as FoundItem).date_found)}
                </p>
                <div className="flex gap-2 mt-3">
                  <Link to={`/item/${tab}/${item.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id, tab)} className="text-red-600 hover:bg-red-50">
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
