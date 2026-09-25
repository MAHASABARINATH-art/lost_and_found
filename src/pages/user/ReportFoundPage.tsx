import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Camera, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/types';
import { generateMatchesForFoundItem, createNotification } from '@/lib/utils';
import { Button, Input, Select, Textarea, Card } from '@/components/ui';
import { PageHeader } from '@/components/AppLayout';

interface FormData {
  item_name: string;
  category: string;
  description: string;
  date_found: string;
  time_found: string;
  location_found: string;
  color: string;
  brand: string;
  identifying_features: string;
  storage_location: string;
  additional_information: string;
}

const empty: FormData = {
  item_name: '',
  category: '',
  description: '',
  date_found: '',
  time_found: '',
  location_found: '',
  color: '',
  brand: '',
  identifying_features: '',
  storage_location: '',
  additional_information: '',
};

export default function ReportFoundPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof FormData, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.item_name.trim()) e.item_name = 'Item name is required';
    if (!form.category) e.category = 'Category is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.date_found) e.date_found = 'Date is required';
    if (!form.location_found.trim()) e.location_found = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setServerError('Image must be under 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        setServerError('Only JPEG, PNG, WebP, or GIF images are allowed');
        return;
      }
      setServerError('');
      setImageFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);

    let image_url: string | null = null;

    if (imageFile && profile) {
      const ext = imageFile.name.split('.').pop();
      const fileName = `found-${profile.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, imageFile);
      if (uploadError) {
        setServerError('Failed to upload image. Please try again.');
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(fileName);
      image_url = urlData.publicUrl;
    }

    const { data, error: insertError } = await supabase
      .from('found_items')
      .insert({
        ...form,
        image_url,
        status: 'Found',
      })
      .select()
      .single();

    if (insertError) {
      setServerError('Failed to submit report. Please try again.');
      setLoading(false);
      return;
    }

    await generateMatchesForFoundItem(data);
    if (profile) {
      await createNotification(
        profile.id,
        'Found Report Submitted',
        `Your found item report for "${form.item_name}" has been submitted successfully.`,
        'found_item',
        data.id
      );
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate('/my-reports'), 2000);
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Report Submitted!</h2>
          <p className="text-slate-500 mt-1">Redirecting to your reports...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Report Found Item" subtitle="Provide details about the item you found" />

      {serverError && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Item Name *"
            value={form.item_name}
            onChange={(e) => update('item_name', e.target.value)}
            error={errors.item_name}
            placeholder="e.g. Black Laptop Bag"
          />

          <Select
            label="Category *"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            error={errors.category}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>

          <Textarea
            label="Description *"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            error={errors.description}
            rows={3}
            placeholder="Describe the item in detail..."
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Date Found *"
              type="date"
              value={form.date_found}
              onChange={(e) => update('date_found', e.target.value)}
              error={errors.date_found}
              max={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="Approximate Time"
              type="time"
              value={form.time_found}
              onChange={(e) => update('time_found', e.target.value)}
            />
          </div>

          <Input
            label="Location Found *"
            value={form.location_found}
            onChange={(e) => update('location_found', e.target.value)}
            error={errors.location_found}
            placeholder="e.g. Cafeteria, Table 5"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => update('color', e.target.value)}
              placeholder="e.g. Black"
            />
            <Input
              label="Brand"
              value={form.brand}
              onChange={(e) => update('brand', e.target.value)}
              placeholder="e.g. Dell"
            />
          </div>

          <Textarea
            label="Identifying Features"
            value={form.identifying_features}
            onChange={(e) => update('identifying_features', e.target.value)}
            rows={2}
            placeholder="Scratches, stickers, engravings, etc."
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Image (optional)</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm font-medium text-slate-700">
                <Camera className="w-5 h-5" />
                {imageFile ? imageFile.name : 'Choose image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {imageFile && (
                <span className="text-sm text-slate-500">({(imageFile.size / 1024 / 1024).toFixed(1)} MB)</span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Max 5MB. JPEG, PNG, WebP, or GIF.</p>
          </div>

          <Input
            label="Current Storage Location"
            value={form.storage_location}
            onChange={(e) => update('storage_location', e.target.value)}
            placeholder="e.g. Security Office, Lost & Found Box"
          />

          <Textarea
            label="Additional Information"
            value={form.additional_information}
            onChange={(e) => update('additional_information', e.target.value)}
            rows={2}
            placeholder="Any other details..."
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
