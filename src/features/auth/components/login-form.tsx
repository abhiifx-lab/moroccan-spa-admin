'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { OFFICIAL_LOGINS, PresetCredential } from '@/lib/auth-credentials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Mail,
  ShieldAlert,
  Crown,
  ShieldCheck,
  Building2,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard';
  const { login } = useAuth();

  const [selectedCred, setSelectedCred] = useState<PresetCredential>(OFFICIAL_LOGINS[0]);
  const [email, setEmail] = useState(OFFICIAL_LOGINS[0].email);
  const [password, setPassword] = useState(OFFICIAL_LOGINS[0].passwordText);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCheatSheet, setShowCheatSheet] = useState(true);

  const handleSelectPreset = (cred: PresetCredential) => {
    setSelectedCred(cred);
    setEmail(cred.email);
    setPassword(cred.passwordText);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }
      if (!password) {
        throw new Error('Please enter a password.');
      }
      await login(email, password, selectedCred.role);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountIcon = (role: string, emailStr: string) => {
    if (role === 'super_admin') return <Crown className="w-4 h-4 text-amber-500 shrink-0" />;
    if (role === 'admin') return <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />;
    if (emailStr.includes('pallasio')) return <Building2 className="w-4 h-4 text-purple-500 shrink-0" />;
    if (emailStr.includes('holidayinn')) return <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    return <MapPin className="w-4 h-4 text-rose-500 shrink-0" />;
  };

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Main Login Box (Left / Top) */}
      <Card className="md:col-span-7 shadow-2xl border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-amber-600/20 p-3 rounded-2xl w-14 h-14 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2 border border-amber-500/20 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Moroccan Spa Portal
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Multi-Tenant Internal Operating System for Moroccan Spa Lucknow
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-2">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in-50">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Login Preset Badges */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Select Login Preset (5 Accounts)</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Click to auto-fill</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {OFFICIAL_LOGINS.map((cred) => {
                  const isSelected = cred.email.toLowerCase() === email.toLowerCase();
                  return (
                    <button
                      key={cred.id}
                      type="button"
                      onClick={() => handleSelectPreset(cred)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getAccountIcon(cred.role, cred.email)}
                        <div className="truncate">
                          <div className="font-semibold flex items-center gap-1.5 text-[12px]">
                            <span>{cred.name}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {cred.email}
                          </div>
                        </div>
                      </div>
                      <Badge variant={cred.badgeVariant} className="text-[10px] uppercase font-bold shrink-0 ml-2">
                        {cred.roleLabel}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="email@moroccanspa.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  const matched = OFFICIAL_LOGINS.find((c) => c.email.toLowerCase() === e.target.value.toLowerCase());
                  if (matched) setSelectedCred(matched);
                }}
                icon={<Mail className="w-4 h-4 text-slate-400" />}
                required
                className="h-11 rounded-xl text-sm"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] font-mono text-slate-400">Default: {selectedCred.passwordText}</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4 text-slate-400" />}
                  required
                  className="h-11 rounded-xl text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all text-sm"
              isLoading={isLoading}
            >
              Sign In as {selectedCred.roleLabel}
            </Button>
            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
              Assigned Scope: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCred.outletName}</span>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Credentials Reference Box (Right / Bottom) */}
      <Card className="md:col-span-5 border-slate-200 dark:border-slate-800 bg-slate-900 text-white shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
              <KeyRound className="w-4 h-4" /> 5 Official Logins Credentials
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              Pre-configured system accounts with passwords
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setShowCheatSheet(!showCheatSheet)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            {showCheatSheet ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </CardHeader>

        {showCheatSheet && (
          <CardContent className="pt-3 space-y-3 text-xs">
            {OFFICIAL_LOGINS.map((cred, idx) => (
              <div
                key={cred.id}
                onClick={() => handleSelectPreset(cred)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selectedCred.id === cred.id
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-[12px] mb-1">
                  <span className="text-slate-200 flex items-center gap-1.5">
                    <span className="text-amber-400 font-mono text-[10px]">{idx + 1}.</span> {cred.roleLabel}
                  </span>
                  <Badge variant={cred.badgeVariant} className="text-[9px] px-1.5 py-0 uppercase">
                    {cred.role}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] text-slate-300 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Email:</span>
                    <span className="text-amber-200/90 font-medium">{cred.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Password:</span>
                    <span className="text-emerald-400 font-bold tracking-wide">{cred.passwordText}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Outlet:</span>
                    <span className="truncate max-w-[150px] text-right font-sans">{cred.outletName}</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 text-[10px] text-slate-300 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>
                Select any account above or click <strong>Sign In</strong> to authenticate and test multi-centre data isolation.
              </span>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
