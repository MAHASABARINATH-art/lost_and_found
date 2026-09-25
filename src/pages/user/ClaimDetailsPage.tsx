import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Claim } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Card, Button, LoadingPage, ItemImage } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

export default function ClaimDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !profile) return;
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select(`
          *,
          found_item:found_items(*),
          lost_item:lost_items(*)
        `)
        .eq('id', id)
        .maybeSingle();
      setClaim(data as Claim | null);
      setLoading(false);
    }
    load();
  }, [id, profile]);

  if (loading) return <LoadingPage />;

  if (!claim) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Claim not found.</p>
        <Link to="/my-claims" className="text-blue-600 font-medium mt-2 inline-block">Back to My Claims</Link>
      </div>
    );
  }

  const answers = claim.verification_answers || {};
  const answerLabels: Record<string, string> = {
    where_lost: 'Where did you lose the item?',
    when_lost: 'When did you lose it?',
    identifying_features: 'Identifying features',
    contents: 'What was inside it?',
    unique_info: 'Other unique information',
  };

  const statusInfo: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; text: string }> = {
    'Claim Submitted': { icon: Clock, color: 'text-blue-600', text: 'Your claim has been submitted and is waiting for admin review.' },
    'Under Review': { icon: Clock, color: 'text-amber-600', text: 'An admin is currently reviewing your claim.' },
    'Approved': { icon: CheckCircle, color: 'text-green-600', text: 'Your claim has been approved! The item is reserved for return. Please contact the admin to arrange pickup.' },
    'Rejected': { icon: XCircle, color: 'text-red-600', text: 'Your claim has been rejected.' },
    'Returned': { icon: Package, color: 'text-amber-600', text: 'The item has been marked as returned.' },
    'Completed': { icon: CheckCircle, color: 'text-green-600', text: 'The return process is complete. Thank you!' },
  };

  const info = statusInfo[claim.status] || statusInfo['Claim Submitted'];
  const StatusIcon = info.icon;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/my-claims')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to My Claims
      </button>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Item info */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Item Information</h2>
          {claim.found_item && (
            <>
              <ItemImage src={claim.found_item.image_url} alt={claim.found_item.item_name} className="w-full h-40 rounded-lg object-cover mb-3" />
              <h3 className="font-bold text-slate-900">{claim.found_item.item_name}</h3>
              <p className="text-sm text-slate-500">{claim.found_item.category}</p>
              <p className="text-sm text-slate-500 mt-1">Found at {claim.found_item.location_found}</p>
              <p className="text-sm text-slate-400">on {formatDate(claim.found_item.date_found)}</p>
            </>
          )}
        </Card>

        {/* Claim info */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Claim Status</h2>
              <StatusBadge status={claim.status} />
            </div>
            <div className={`flex items-start gap-3 ${info.color}`}>
              <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{info.text}</p>
            </div>
            {claim.status === 'Rejected' && claim.admin_reason && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700">Reason:</p>
                <p className="text-sm text-red-600 mt-1">{claim.admin_reason}</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500 space-y-1">
              <p>Submitted: {formatDateTime(claim.created_at)}</p>
              <p>Last updated: {formatDateTime(claim.updated_at)}</p>
              {claim.reviewed_at && <p>Reviewed: {formatDateTime(claim.reviewed_at)}</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Verification answers */}
      <Card className="p-6 mt-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Your Verification Information</h2>
        <div className="space-y-4">
          {Object.entries(answerLabels).map(([key, label]) => {
            const value = answers[key];
            if (!value) return null;
            return (
              <div key={key}>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-sm text-slate-600 mt-1">{value}</p>
              </div>
            );
          })}
          {claim.proof_information && (
            <div>
              <p className="text-sm font-medium text-slate-700">Additional proof / information</p>
              <p className="text-sm text-slate-600 mt-1">{claim.proof_information}</p>
            </div>
          )}
          {Object.keys(answers).length === 0 && !claim.proof_information && (
            <p className="text-sm text-slate-500">No verification information provided.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
