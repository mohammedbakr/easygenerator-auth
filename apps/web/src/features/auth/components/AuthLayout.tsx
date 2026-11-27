import { ShieldCheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Centred card shell shared by the auth pages. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md gap-6 border border-border p-2 shadow-card ring-0">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-primary-foreground">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">{APP_NAME}</span>
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
