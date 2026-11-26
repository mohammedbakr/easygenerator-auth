import { Link } from 'react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export function SignInPage() {
  return (
    <AuthLayout title="Sign in" description="Welcome back.">
      <p className="text-sm text-muted-foreground">
        No account?{' '}
        <Link to="/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
