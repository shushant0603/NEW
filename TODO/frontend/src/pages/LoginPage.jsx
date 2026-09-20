import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Zap,
  KeyRound,
  Building2,
  ChevronRight,
} from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Defined test credentials in code
  const TEST_CREDENTIALS = {
    email: 'admin@gulshan.in',
    password: 'gulshan123',
    name: 'Gulshan Kumar',
    role: '',
    badge: 'Admin • Full Access',
  };

  const handleQuickFill = () => {
    setEmail(TEST_CREDENTIALS.email);
    setPassword(TEST_CREDENTIALS.password);
    setErrorMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    // Validate strictly against defined test credentials
    setTimeout(() => {
      setLoading(false);
      if (
        email.trim().toLowerCase() === TEST_CREDENTIALS.email.toLowerCase() &&
        password === TEST_CREDENTIALS.password
      ) {
        const userObj = {
          name: TEST_CREDENTIALS.name,
          email: TEST_CREDENTIALS.email,
          role: TEST_CREDENTIALS.role,
          badge: TEST_CREDENTIALS.badge,
        };
        if (rememberMe) {
          localStorage.setItem('auth_user', JSON.stringify(userObj));
        }
        onLogin(userObj);
      } else {
        setErrorMessage('Invalid credentials. Please enter the authorized test email and password.');
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#07132B] relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden font-sans select-none">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Background Grid Accent */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Container */}
      <div className="w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* ── Left Side: Platform Showcase & Badges (5 cols) ── */}
        <div className="lg:col-span-5 text-white space-y-6 hidden lg:block pr-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>IRDAI Regulatory Analytics Suite</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 p-0.5 shadow-xl shadow-blue-900/40">
                <div className="w-full h-full bg-[#0B1E48] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  SureInsight AI
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">Life Insurance Predictive Intelligence</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed pt-2">
              Next-generation predictive intelligence platform for actuarial modeling, market share forecasting, and zero-leakage time series backtesting.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-start space-x-3 transition-all hover:bg-white/[0.07]">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">24-Month Future Projections</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Prophet & SARIMA engines with 95% Bayesian uncertainty bounds (Sep 2026 – Aug 2028).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-start space-x-3 transition-all hover:bg-white/[0.07]">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Test Period Error Variance</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  19-Month untouched test holdout (Feb 2025 – Aug 2026) with 93.89% verified model accuracy.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-start space-x-3 transition-all hover:bg-white/[0.07]">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Hierarchical Aggregation</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Instant drill-downs across 29 Life Insurers and 10+ Individual & Group Categories.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-2 border-t border-white/10">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>IRDAI Data Standard</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Temporal Leakage</span>
            </span>
          </div>
        </div>

        {/* ── Right Side: Glassmorphic Login Card (7 cols) ── */}
        <div className="lg:col-span-7 w-full max-w-lg mx-auto">
          <div className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 sm:p-9 space-y-6 relative">
            {/* Centered Header */}
            <div className="text-center flex flex-col items-center pt-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F2D64] via-[#1D4ED8] to-[#2563EB] p-0.5 shadow-xl shadow-blue-900/20 mb-3 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B1E48] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F2D64] tracking-tight">
                Sign In to SureInsight AI
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1.5 max-w-sm">
                Enter your authorized credentials to access predictive analytics
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2 animate-shake">
                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Email Address / Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={TEST_CREDENTIALS.email}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#0F2D64] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="text-[11px] text-[#2563EB] hover:underline font-semibold cursor-pointer"
                  >
                    Reset to default
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#0F2D64] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Note */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Remember my session</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Default: <strong className="text-slate-600 font-mono">{TEST_CREDENTIALS.password}</strong></span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0F2D64] via-[#1D4ED8] to-[#2563EB] hover:from-[#0B1E48] hover:to-[#1E40AF] text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/25 transition-all transform active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in securely...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Helper Credentials Footer */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Test Login: <strong className="text-[#0F2D64] font-mono">{TEST_CREDENTIALS.email}</strong> / <strong className="text-[#0F2D64] font-mono">{TEST_CREDENTIALS.password}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-[#2563EB] font-bold hover:underline cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
