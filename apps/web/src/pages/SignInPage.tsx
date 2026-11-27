import { Link } from 'react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { APP_NAME } from '@/lib/constants';

export function SignInPage() {
  return (
    <>
      <title>{`Sign in | ${APP_NAME}`}</title>
      <AuthLayout title="Sign in" description="Welcome back.">
        <div className="flex flex-col gap-6">
          <SignInForm />
          <p className="text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/signup" className="font-medium text-brand underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
}
