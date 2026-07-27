'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Lock, Mail, ShieldAlert } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@moroccanspa.in');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'manager' | 'receptionist' | 'content_writer' | 'therapist'>('super_admin');
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
      await login(email, selectedRole);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto bg-amber-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center text-amber-500 mb-2">
          <Lock className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Moroccan Spa Lucknow</CardTitle>
        <CardDescription>
          Internal Operating System for moroccanspa.in
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="admin@moroccanspa.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Demo Admin Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="super_admin">Super Admin (Full Operational Access)</option>
              <option value="manager">Manager (Operations & Marketing)</option>
              <option value="receptionist">Receptionist (Bookings & Customers)</option>
              <option value="content_writer">Content Writer (Blogs & SEO)</option>
              <option value="therapist">Therapist (Schedule View)</option>
            </select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In to Dashboard
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Protected area. Unauthorized access attempts are monitored and logged.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
