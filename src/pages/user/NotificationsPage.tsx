import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/types';
import { timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, Button, LoadingPage, EmptyState } from '@/components/ui';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadNotifications();
  }, [profile]);

  async function loadNotifications() {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifications((data || []) as Notification[]);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllAsRead() {
    if (!profile) return;
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unread.map((n) => n.id));
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  }

  async function deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter((n) => n.id !== id));
  }

  if (loading) return <LoadingPage />;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up'}
        action={
          unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
            </Button>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          message="You will be notified about matches, claims, and status updates here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`p-4 ${notif.is_read ? '' : 'border-blue-300 bg-blue-50/30'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notif.is_read ? 'bg-slate-100' : 'bg-blue-100'
                }`}>
                  <Bell className={`w-5 h-5 ${notif.is_read ? 'text-slate-400' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm ${notif.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(notif.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="text-xs text-blue-600 font-medium hover:text-blue-700"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
