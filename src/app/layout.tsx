import './globals.css';
import { ReactNode } from 'react';
import { Montserrat } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { SidebarProvider } from '@/hooks/use-sidebar';
import { Toaster } from 'sonner';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata = {
  title: 'Moroccan Spa Operating System',
  description: 'Enterprise Spa Management Operating System',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`light ${montserrat.variable}`} suppressHydrationWarning>
      <body className={`${montserrat.className} min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white font-sans`}>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>
              {children}
              <Toaster richColors position="top-right" closeButton />
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
