import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { FoundItem, LostItem } from '@/types';
import { createNotification } from '@/lib/utils';
import { Card, Button, Input, Textarea, LoadingPage, ItemImage } from '@/components/ui';
import { PageHeader } from '@/components/AppLayout';

export default function ClaimItemPage() {
  const { foundItemId } = useParams<{ foundItemId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [foundItem, setFoundItem] = useState<FoundItem | null>(null);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [answers, setAnswers] = useState({
    where_lost: '',
    when_lost: '',
    identifying_features: '',
    contents: '',
    unique_info: '',
  });
  const [lostItemId, setLostItemId] = useState('');
  const [proof, setProof] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!foundItemId || !profile) return;
    async function load() {
      const { data: found } = await supabase
        .from('found_items')
        .select('*')
        .eq('id', foundItemId)
        .maybeSingle();
      if (found) setFoundItem(found as FoundItem);

      const { data: lost } = await supabase
        .from('lost_items')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false });
      setLostItems((lost || []) as LostItem[]);
      setLoading(false);
    }
    load();
  }, [foundItemId, profile]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!answers.where_lost.trim()) e.where_lost = 'Please explain where you lost the item';
    if (!answers.when_lost.trim()) e.when_lost = 'Please explain when you lost the item';
    if (!answers.identifying_features.trim()) e.identifying_features = 'Please describe identifying features';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    if (!validate() || !foundItem || !profile) return;
    setSubmitting(true);

    // Check if already claimed by this user
    const { data: existing } = await supabase
      .from('claims')
      .select('id')
      .eq('found_item_id', foundItem.id)
      .eq('user_id', profile.id)
      .neq('status', 'Rejected')
      .maybeSingle();

    if (existing) {
      setError('You have already submitted a claim for this item.');
      setSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('claims')
      .insert({
        found_item_id: foundItem.id,
        lost_item_id: lostItemId || null,
        user_id: profile.id,
        verification_answers: answers,
        proof_information: proof || null,
        status: 'Claim Submitted',
      })
      .select()
      .single();

    if (insertError) {
      setError('Failed to submit claim. Please try again.');
      setSubmitting(false);
      return;
    }

    // Notify the finder and the claimant
    await createNotification(
      foundItem.user_id,
      'New Claim on Your Found Item',
      `Someone has submitted a claim for "${foundItem.item_name}".`,
      'claim',
      data.id
    );
    await createNotification(
      profile.id,
      'Claim Submitted',
      `Your claim for "${foundItem.item_name}" has been submitted and is pending review.`,
      'claim',
      data.id
    );

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => navigate('/my-claims'), 2000);
  };

  if (loading) return <LoadingPage />;

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Claim Submitted!</h2>
          <p className="text-slate-500 mt-1">Redirecting to your claims...</p>
        </Card>
      </div>
    );
  }

  if (!foundItem) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Item not found.</p>
        <button onClick={() => navigate('/search')} className="text-blue-600 font-medium mt-2">Back to Search</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <PageHeader title="Claim This Item" subtitle="Provide verification information to support your claim" />

      <Card className="p-4 mb-4">
        <div className="flex gap-4">
          <ItemImage src={foundItem.image_url} alt={foundItem.item_name} className="w-20 h-20 rounded-lg object-cover shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900">{foundItem.item_name}</h3>
            <p className="text-sm text-slate-500">{foundItem.category} · {foundItem.location_found}</p>
            <p className="text-sm text-slate-400 mt-0.5">Found on {foundItem.date_found}</p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Your answers will be reviewed by an admin to verify ownership. Please be as specific as possible.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {lostItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Link to your lost report (optional)
              </label>
              <select
                value={lostItemId}
                onChange={(e) => setLostItemId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
              >
                <option value="">No linked lost report</option>
                {lostItems.map((li) => (
                  <option key={li.id} value={li.id}>
                    {li.item_name} — {li.location_lost} ({li.date_lost})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Textarea
            label="Where did you lose the item? *"
            value={answers.where_lost}
            onChange={(e) => setAnswers({ ...answers, where_lost: e.target.value })}
            error={errors.where_lost}
            rows={2}
            placeholder="Describe the specific location where you believe you lost it..."
          />

          <Textarea
            label="When did you lose it? *"
            value={answers.when_lost}
            onChange={(e) => setAnswers({ ...answers, when_lost: e.target.value })}
            error={errors.when_lost}
            rows={2}
            placeholder="Approximate date and time..."
          />

          <Textarea
            label="What identifying features does it have? *"
            value={answers.identifying_features}
            onChange={(e) => setAnswers({ ...answers, identifying_features: e.target.value })}
            error={errors.identifying_features}
            rows={2}
            placeholder="Scratches, stickers, engravings, or other unique marks..."
          />

          <Textarea
            label="What was inside it, if applicable?"
            value={answers.contents}
            onChange={(e) => setAnswers({ ...answers, contents: e.target.value })}
            rows={2}
            placeholder="Contents of bags, cases, wallets, etc."
          />

          <Textarea
            label="What other unique information can you provide?"
            value={answers.unique_info}
            onChange={(e) => setAnswers({ ...answers, unique_info: e.target.value })}
            rows={2}
            placeholder="Any other proof of ownership..."
          />

          <Textarea
            label="Additional proof or information"
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            rows={2}
            placeholder="Receipt numbers, serial numbers, witness info, etc."
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
