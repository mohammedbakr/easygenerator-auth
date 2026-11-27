import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useLogout, useMe } from '@/features/auth/hooks';
import { APP_NAME } from '@/lib/constants';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppPage() {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => navigate('/signin', { replace: true }) });

  return (
    <>
      <title>{`Welcome | ${APP_NAME}`}</title>
      <main className="flex min-h-svh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border border-border shadow-card ring-0">
          <CardContent className="flex flex-col items-center gap-6 p-6 text-center">
            {user && (
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand"
              >
                {initials(user.name)}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold">Welcome to the application.</h1>
              {user && (
                <p className="text-muted-foreground">
                  Signed in as {user.name} ({user.email})
                </p>
              )}
            </div>
            <Button type="button" variant="outline" disabled={logout.isPending} onClick={signOut}>
              {logout.isPending && <Spinner />}
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
