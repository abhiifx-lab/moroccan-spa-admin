import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = {
  title: 'Admin Login | Moroccan Spa',
  description: 'Authentication portal for Moroccan Spa Platform Administrator access.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md p-6 bg-card rounded-xl border border-border text-center text-muted-foreground">
        Loading Authentication Portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
