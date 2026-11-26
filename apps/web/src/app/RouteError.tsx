import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/** Router errorElement: friendly message, no stack trace. */
export function RouteError() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">An unexpected error occurred. Please try again.</p>
      <Button asChild variant="outline">
        <Link to="/app">Go home</Link>
      </Button>
    </main>
  );
}
