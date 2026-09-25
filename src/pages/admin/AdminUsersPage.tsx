import { useEffect, useState } from 'react';
import { Search, Users as UsersIcon, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, LoadingPage, EmptyState, Button } from '@/components/ui';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (queryError) {
        setError('Unable to load users. Please try again.');
        setLoading(false);
        return;
      }
      setUsers((data || []) as Profile[]);
      setError('');
      setLoading(false);
    }
    load();
  }, []);

  const toggleStatus = async (user: Profile) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', user.id);
    if (updateError) {
      alert('Failed to update user status: ' + updateError.message);
      return;
    }
    setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
  };

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.student_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div>
        <PageHeader title="User Management" subtitle="View and manage all user accounts" />
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle="View and manage all user accounts" />

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or student ID..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" message="No users match your search." />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Student ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Registered</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.student_id}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                        user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      {user.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant={user.status === 'active' ? 'outline' : 'primary'}
                          onClick={() => toggleStatus(user)}
                        >
                          {user.status === 'active' ? (
                            <span className="flex items-center gap-1"><UserX className="w-4 h-4" /> Suspend</span>
                          ) : (
                            <span className="flex items-center gap-1"><UserCheck className="w-4 h-4" /> Activate</span>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filtered.map((user) => (
              <div key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{user.full_name}</h3>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                    user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.status}
                  </span>
                </div>
                <div className="text-sm text-slate-600 space-y-0.5">
                  <p>Student ID: {user.student_id}</p>
                  <p>Phone: {user.phone || '—'}</p>
                  <p>Role: <span className="capitalize">{user.role}</span></p>
                  <p>Registered: {formatDate(user.created_at)}</p>
                </div>
                {user.role !== 'admin' && (
                  <Button
                    size="sm"
                    variant={user.status === 'active' ? 'outline' : 'primary'}
                    onClick={() => toggleStatus(user)}
                    className="mt-3"
                  >
                    {user.status === 'active' ? 'Suspend' : 'Activate'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
