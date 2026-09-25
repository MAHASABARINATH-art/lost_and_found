import { Link } from 'react-router-dom';
import { Search, PackageSearch, ShieldCheck, ArrowRight, MapPin } from 'lucide-react';

export default function SplashPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">Lost & Found</p>
              <p className="text-xs text-slate-500">Campus Recovery System</p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-3xl w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 mb-6">
            <Search className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Campus Lost & Found
          </h1>
          <p className="text-lg text-slate-600 mb-2 max-w-xl mx-auto">
            Report, search, and reclaim lost items across campus.
          </p>
          <p className="text-sm text-slate-500 mb-8 max-w-lg mx-auto">
            Submit lost or found reports, get matched automatically, verify ownership, and track returns — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-7 py-3 bg-white text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors border border-slate-300"
            >
              Login
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <FeatureCard icon={Search} title="Search & Match" desc="Find items by category, location, and smart matching" />
            <FeatureCard icon={PackageSearch} title="Report Easily" desc="Log lost or found items with photos and details" />
            <FeatureCard icon={ShieldCheck} title="Secure Claims" desc="Verify ownership through admin-reviewed claims" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Campus Lost & Found System
          </span>
          <span>Secure · Admin-Reviewed · Real-Time</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200 text-left">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <h3 className="text-slate-900 font-semibold text-sm mb-1">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}
