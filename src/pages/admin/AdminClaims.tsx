import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
  Package,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Claim, Profile, FoundItem, LostItem } from '@/types';
import { formatDate, formatDateTime, createNotification } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, Select, Button, LoadingPage, EmptyState, ItemImage, Textarea } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

interface ClaimWithRelations extends Omit<Claim, 'found_item' | 'lost_item' | 'user'> {
  found_item: FoundItem | null;
  lost_item: LostItem | null;
  user: Pick<Profile, 'full_name' | 'email' | 'student_id'> | null;
}

export default function AdminClaims() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<ClaimWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadClaims();
  }, []);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadClaims() {
    const { data, error: queryError } = await supabase
      .from('claims')
      .select(`
        *,
        found_item:found_items(*),
        lost_item:lost_items(*),
        user:profiles(full_name, email, student_id)
      `)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('Unable to load claims. Please try again.');
      setLoading(false);
      return;
    }
    setClaims((data || []) as ClaimWithRelations[]);
    setError('');
    setLoading(false);
  }

  const filtered = claims.filter((claim) => {
    if (statusFilter === 'pending' && !['Claim Submitted', 'Under Review', 'Approved'].includes(claim.status)) return false;
    if (statusFilter === 'reviewed' && !['Rejected', 'Returned', 'Completed'].includes(claim.status)) return false;
    if (statusFilter !== 'pending' && statusFilter !== 'reviewed' && statusFilter !== 'all' && claim.status !== statusFilter) return false;
    if (search) {
      const kw = search.toLowerCase();
      if (
        !claim.found_item?.item_name?.toLowerCase().includes(kw) &&
        !claim.user?.full_name?.toLowerCase().includes(kw)
      )
        return false;
    }
    return true;
  });

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

  const handleApprove = async (claim: ClaimWithRelations) => {
    if (!profile) return;
    if (!confirm('Approve this claim? The item will be reserved for return.')) return;
    setActionLoading(true);

    const { error: claimError } = await supabase
      .from('claims')
      .update({
        status: 'Approved',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claim.id);

    if (claimError) {
      showToast('error', 'Failed to approve claim: ' + claimError.message);
      setActionLoading(false);
      return;
    }

    if (claim.found_item) {
      const { error: itemError } = await supabase.from('found_items').update({ status: 'Claimed' }).eq('id', claim.found_item.id);
      if (itemError) {
        console.error('Failed to update found item status:', itemError.message);
      }
    }

    await createNotification(
      claim.user_id,
      'Claim Approved',
      `Your claim for "${claim.found_item?.item_name}" has been approved. The item is reserved for return.`,
      'claim',
      claim.id
    );

    await logAdminAction('approve_claim', 'claim', claim.id, `Approved claim for ${claim.found_item?.item_name}`);

    showToast('success', 'Claim approved successfully. The claimant has been notified.');
    await loadClaims();
    setActionLoading(false);
  };

  const handleReject = async (claim: ClaimWithRelations) => {
    if (!profile) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    if (!confirm('Reject this claim?')) return;
    setActionLoading(true);

    const { error: claimError } = await supabase
      .from('claims')
      .update({
        status: 'Rejected',
        admin_reason: rejectReason,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claim.id);

    if (claimError) {
      showToast('error', 'Failed to reject claim: ' + claimError.message);
      setActionLoading(false);
      return;
    }

    await createNotification(
      claim.user_id,
      'Claim Rejected',
      `Your claim for "${claim.found_item?.item_name}" has been rejected. Reason: ${rejectReason}`,
      'claim',
      claim.id
    );

    await logAdminAction('reject_claim', 'claim', claim.id, `Rejected claim for ${claim.found_item?.item_name}: ${rejectReason}`);

    setRejectReason('');
    showToast('success', 'Claim rejected. The claimant has been notified.');
    await loadClaims();
    setActionLoading(false);
  };

  const handleMarkReturned = async (claim: ClaimWithRelations) => {
    if (!confirm('Mark this item as returned?')) return;
    setActionLoading(true);

    const { error: claimError } = await supabase.from('claims').update({ status: 'Returned' }).eq('id', claim.id);
    if (claimError) {
      showToast('error', 'Failed to mark as returned: ' + claimError.message);
      setActionLoading(false);
      return;
    }

    if (claim.found_item) {
      await supabase.from('found_items').update({ status: 'Returned' }).eq('id', claim.found_item.id);
    }
    if (claim.lost_item) {
      await supabase.from('lost_items').update({ status: 'Returned' }).eq('id', claim.lost_item.id);
    }

    await createNotification(
      claim.user_id,
      'Item Returned',
      `The item "${claim.found_item?.item_name}" has been marked as returned.`,
      'claim',
      claim.id
    );

    await logAdminAction('mark_returned', 'claim', claim.id, `Marked ${claim.found_item?.item_name} as returned`);

    showToast('success', 'Item marked as returned.');
    await loadClaims();
    setActionLoading(false);
  };

  const handleComplete = async (claim: ClaimWithRelations) => {
    if (!confirm('Mark this case as completed?')) return;
    setActionLoading(true);

    const { error: claimError } = await supabase.from('claims').update({ status: 'Completed' }).eq('id', claim.id);
    if (claimError) {
      showToast('error', 'Failed to complete case: ' + claimError.message);
      setActionLoading(false);
      return;
    }

    if (claim.found_item) {
      await supabase.from('found_items').update({ status: 'Completed' }).eq('id', claim.found_item.id);
    }
    if (claim.lost_item) {
      await supabase.from('lost_items').update({ status: 'Completed' }).eq('id', claim.lost_item.id);
    }

    await createNotification(
      claim.user_id,
      'Process Completed',
      `The return process for "${claim.found_item?.item_name}" is now complete. Thank you!`,
      'claim',
      claim.id
    );

    await logAdminAction('complete_claim', 'claim', claim.id, `Completed return process for ${claim.found_item?.item_name}`);

    showToast('success', 'Case marked as completed.');
    await loadClaims();
    setActionLoading(false);
  };

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div>
        <PageHeader title="Claim Review" subtitle="Review, approve, reject, and process item returns" />
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const answerLabels: Record<string, string> = {
    where_lost: 'Where did you lose the item?',
    when_lost: 'When did you lose it?',
    identifying_features: 'Identifying features',
    contents: 'What was inside it?',
    unique_info: 'Other unique information',
  };

  return (
    <div>
      <PageHeader title="Claim Review" subtitle="Review, approve, reject, and process item returns" />

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <Card className="p-4 mb-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item or claimant..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="pending">Pending (Submitted/Review/Approved)</option>
            <option value="reviewed">Reviewed (Rejected/Returned/Completed)</option>
            <option value="all">All claims</option>
            <option value="Claim Submitted">Claim Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Returned">Returned</option>
            <option value="Completed">Completed</option>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No claims found" message="No claims match your filters." />
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <Card key={claim.id} className="overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(expandedId === claim.id ? null : claim.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {expandedId === claim.id ? (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                  {claim.found_item?.image_url && (
                    <ItemImage src={claim.found_item.image_url} alt={claim.found_item.item_name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">
                      {claim.found_item?.item_name || 'Unknown item'}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {claim.user?.full_name || 'Unknown'} · {formatDate(claim.created_at)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  <StatusBadge status={claim.status} />
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === claim.id && (
                <div className="border-t border-slate-100 p-4 space-y-4">
                  {/* Item info */}
                  {claim.found_item && (
                    <div className="flex gap-4">
                      <ItemImage src={claim.found_item.image_url} alt={claim.found_item.item_name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shrink-0" />
                      <div className="text-sm">
                        <h4 className="font-semibold text-slate-900">{claim.found_item.item_name}</h4>
                        <p className="text-slate-500">{claim.found_item.category}</p>
                        <p className="text-slate-500">Found at {claim.found_item.location_found}</p>
                        <p className="text-slate-400">on {formatDate(claim.found_item.date_found)}</p>
                        {claim.found_item.storage_location && (
                          <p className="text-slate-500 mt-1">Storage: {claim.found_item.storage_location}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Related lost report */}
                  {claim.lost_item && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Related Lost Report</h4>
                      <div className="text-sm text-slate-600 space-y-0.5">
                        <p className="font-medium">{claim.lost_item.item_name}</p>
                        <p>Lost at {claim.lost_item.location_lost} on {formatDate(claim.lost_item.date_lost)}</p>
                        {claim.lost_item.description && <p className="text-slate-500">{claim.lost_item.description}</p>}
                      </div>
                    </div>
                  )}

                  {/* Claimant info */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Claimant</h4>
                    <div className="text-sm text-slate-600 space-y-0.5">
                      <p>Name: {claim.user?.full_name || 'N/A'}</p>
                      <p>Student ID: {claim.user?.student_id || 'N/A'}</p>
                      <p>Email: {claim.user?.email || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Verification answers */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Ownership Verification Information</h4>
                    <div className="space-y-3">
                      {Object.entries(answerLabels).map(([key, label]) => {
                        const value = claim.verification_answers?.[key];
                        if (!value) return null;
                        return (
                          <div key={key} className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className="text-sm text-slate-700 mt-0.5">{value}</p>
                          </div>
                        );
                      })}
                      {claim.proof_information && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                          <p className="text-xs font-medium text-slate-500">Additional proof / information</p>
                          <p className="text-sm text-slate-700 mt-0.5">{claim.proof_information}</p>
                        </div>
                      )}
                      {Object.keys(claim.verification_answers || {}).length === 0 && !claim.proof_information && (
                        <p className="text-sm text-slate-500">No verification information provided.</p>
                      )}
                    </div>
                  </div>

                  {/* Admin reason if rejected */}
                  {claim.status === 'Rejected' && claim.admin_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-700">Rejection Reason</p>
                          <p className="text-sm text-red-600 mt-0.5">{claim.admin_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review timestamps */}
                  {claim.reviewed_at && (
                    <p className="text-xs text-slate-400">Reviewed on {formatDateTime(claim.reviewed_at)}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {(claim.status === 'Claim Submitted' || claim.status === 'Under Review') && (
                      <>
                        <Button
                          onClick={() => handleApprove(claim)}
                          disabled={actionLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-[200px]">
                          <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            rows={1}
                            className="flex-1"
                          />
                          <Button
                            variant="danger"
                            onClick={() => handleReject(claim)}
                            disabled={actionLoading}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </>
                    )}
                    {claim.status === 'Approved' && (
                      <Button onClick={() => handleMarkReturned(claim)} disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700">
                        <Package className="w-4 h-4 mr-1" /> Mark as Returned
                      </Button>
                    )}
                    {claim.status === 'Returned' && (
                      <Button onClick={() => handleComplete(claim)} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" /> Mark as Completed
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
