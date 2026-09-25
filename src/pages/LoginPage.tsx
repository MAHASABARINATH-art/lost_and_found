import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let msg = 'Unable to sign in. Please try again.';
      if (error.message === 'Invalid login credentials') {
        msg = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        msg = 'Please confirm your email before logging in.';
      } else if (error.message.includes('rate limit') || error.message.includes('wait') || error.message.includes('seconds')) {
        msg = 'Too many login attempts. Please wait a minute and try again.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        msg = 'Network error. Please check your connection and try again.';
      } else {
        // Show the actual error so the user knows what happened
        msg = error.message;
      }
      console.error('Login error:', error.message, error.status);
      setServerError(msg);
      setLoading(false);
      return;
    }

    // Fetch profile to determine role for redirect.
    const userId = data.user.id;
    let profileRole: string | null = null;
    let profileLoaded = false;

    for (let attempt = 0; attempt < 3 && !profileLoaded; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (!profileError && profile) {
        profileRole = profile.role;
        profileLoaded = true;
      }
    }

    if (!profileLoaded) {
      console.error('Profile could not be loaded during login, redirecting to default');
    }

    if (profileRole === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h1>
          <p className="text-slate-500 text-sm mb-6">Sign in to your Lost & Found account</p>

          {serverError && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border ${
                    errors.email ? 'border-red-400' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900`}
                  placeholder="you@college.edu"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border ${
                    errors.password ? 'border-red-400' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
