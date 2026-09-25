import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';

interface FormErrors {
  full_name?: string;
  student_id?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm_password?: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    student_id: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const validate = () => {
    const e: FormErrors = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.student_id.trim()) e.student_id = 'Student ID is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^[\d\s+()-]{7,}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.confirm_password !== form.password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          student_id: form.student_id,
          phone: form.phone,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already')) {
        setServerError('This email is already registered. Try logging in instead.');
      } else {
        setServerError(error.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check if student_id is unique via profile trigger
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ student_id: form.student_id })
        .eq('id', data.user.id);

      if (profileError && profileError.message.includes('duplicate')) {
        setServerError('This Student ID is already taken. Please use a different one.');
        // Clean up - sign out the user
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Sign out the user so they log in manually
      await supabase.auth.signOut();
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/login'), 2500);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h1>
          <p className="text-slate-500">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create Account</h1>
          <p className="text-slate-500 text-sm mb-6">Join the campus Lost & Found system</p>

          {serverError && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              error={errors.full_name}
              placeholder="John Doe"
            />
            <Input
              label="Student ID"
              value={form.student_id}
              onChange={(e) => update('student_id', e.target.value)}
              error={errors.student_id}
              placeholder="STU2024001"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              error={errors.email}
              placeholder="you@college.edu"
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              error={errors.phone}
              placeholder="+1 555 123 4567"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              error={errors.password}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirm_password}
              onChange={(e) => update('confirm_password', e.target.value)}
              error={errors.confirm_password}
              placeholder="Re-enter password"
            />

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
