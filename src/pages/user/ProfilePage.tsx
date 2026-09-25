import { useState } from 'react';
import { AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, Button, Input } from '@/components/ui';

export default function ProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', profile.id);
    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } else {
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setEditing(false);
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwError('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
    }
    setPwSaving(false);
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="My Profile" subtitle="View and update your account information" />

      {message && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xl font-bold text-white">
            {profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{profile.full_name}</h2>
            <p className="text-sm text-slate-500">
              {profile.role === 'admin' ? 'Administrator' : 'Student'} · Member since {formatDate(profile.created_at)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            {editing ? (
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            ) : (
              <p className="text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-lg">{profile.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Student ID</label>
            <p className="text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-lg">{profile.student_id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <p className="text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-lg">{profile.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            {editing ? (
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" />
            ) : (
              <p className="text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-lg">{profile.phone || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <p className="text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-lg capitalize">{profile.role}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Status</label>
            <p className="text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-lg capitalize">{profile.status}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {editing ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); setFullName(profile.full_name); setPhone(profile.phone || ''); }}>
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </Card>

      <Card className="p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Security</h3>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
            {pwError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{pwError}</span>
              </div>
            )}
            <Button type="submit" disabled={pwSaving}>
              {pwSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Lock className="w-4 h-4" />
            <span>Your password is secured and encrypted.</span>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <Button variant="danger" onClick={async () => { await signOut(); window.location.href = '/login'; }}>
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
