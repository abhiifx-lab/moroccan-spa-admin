'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Lock, Mail, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }
      if (!password) {
        throw new Error('Please enter your password.');
      }
      await login(email, password);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-2xl border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl overflow-hidden">
      <CardHeader className="text-center pb-4 pt-8 space-y-2">
        <div className="mx-auto bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-amber-600/20 p-3.5 rounded-2xl w-14 h-14 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1 border border-amber-500/20 shadow-inner">
          <Lock className="w-7 h-7" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Moroccan Spa
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Admin Portal Authentication
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 sm:px-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in-50">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Address Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="name@moroccanspa.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4 text-slate-400" />}
              required
              className="h-12 rounded-xl text-sm"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-slate-400" />}
                required
                className="h-12 rounded-xl text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 sm:px-8 pb-8 pt-4">
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all text-sm"
            isLoading={isLoading}
          >
            Sign In to Dashboard
          </Button>
          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
            Protected Area — Internal Operating System
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
