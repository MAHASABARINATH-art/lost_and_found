import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Tag, Palette, Package, FileText, Edit, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { LostItem, FoundItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { Card, Button, LoadingPage, ItemImage } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

export default function ItemDetailsPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [item, setItem] = useState<LostItem | FoundItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (!id || !type) return;
    async function load() {
      const table = type === 'lost' ? 'lost_items' : 'found_items';
      const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (data) {
        setItem(data as LostItem | FoundItem);
        setIsOwner(profile?.id === (data as LostItem | FoundItem).user_id);
      }
      setLoading(false);
    }
    load();
  }, [id, type, profile]);

  const handleDelete = async () => {
    if (!item || !type || !isOwner) return;
    if (!confirm('Are you sure you want to delete this report? This cannot be undone.')) return;
    const table = type === 'lost' ? 'lost_items' : 'found_items';
    const { error } = await supabase.from(table).delete().eq('id', item.id);
    if (!error) navigate('/my-reports');
  };

  if (loading) return <LoadingPage />;
  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Item not found.</p>
        <Link to="/search" className="text-blue-600 font-medium mt-2 inline-block">Back to Search</Link>
      </div>
    );
  }

  const isLost = type === 'lost';
  const dateLabel = isLost ? 'Date Lost' : 'Date Found';
  const locationLabel = isLost ? 'Location Lost' : 'Location Found';
  const dateValue = isLost ? (item as LostItem).date_lost : (item as FoundItem).date_found;
  const locationValue = isLost ? (item as LostItem).location_lost : (item as FoundItem).location_found;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Image */}
        <Card className="overflow-hidden">
          <ItemImage
            src={item.image_url}
            alt={item.item_name}
            className="w-full h-72 lg:h-96 object-cover"
          />
        </Card>

        {/* Details */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{item.item_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={item.status} />
                  <span className="text-sm text-slate-500 capitalize">{type} item</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <DetailRow icon={Tag} label="Category" value={item.category} />
              <DetailRow icon={Calendar} label={dateLabel} value={formatDate(dateValue)} />
              <DetailRow icon={MapPin} label={locationLabel} value={locationValue} />
              {item.color && <DetailRow icon={Palette} label="Color" value={item.color} />}
              {item.brand && <DetailRow icon={Package} label="Brand" value={item.brand} />}
              {!isLost && (item as FoundItem).storage_location && (
                <DetailRow icon={MapPin} label="Storage Location" value={(item as FoundItem).storage_location || 'N/A'} />
              )}
            </div>
          </Card>

          {(item.description || item.identifying_features || item.additional_information) && (
            <Card className="p-6">
              {item.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Description</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              )}
              {item.identifying_features && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Identifying Features</h3>
                  <p className="text-sm text-slate-600">{item.identifying_features}</p>
                </div>
              )}
              {item.additional_information && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Additional Information</h3>
                  <p className="text-sm text-slate-600">{item.additional_information}</p>
                </div>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {isOwner ? (
              <>
                <Button variant="outline" onClick={() => navigate(`/report-${type === 'lost' ? 'lost' : 'found'}`)}>
                  <Edit className="w-4 h-4 mr-1" /> Edit Report
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </>
            ) : isLost ? (
              <Button variant="outline" disabled>
                <FileText className="w-4 h-4 mr-1" /> This is a lost item report
              </Button>
            ) : (
              <Button onClick={() => navigate(`/claim/${item.id}`)}>
                <ShieldCheck className="w-4 h-4 mr-1" /> Claim This Item
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <span className="text-slate-400">{label}: </span>
        <span className="text-slate-700 font-medium">{value}</span>
      </div>
    </div>
  );
}
