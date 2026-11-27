import { Link } from 'react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignUpForm } from '@/features/auth/components/SignUpForm';
import { APP_NAME } from '@/lib/constants';

export function SignUpPage() {
  return (
    <>
      <title>{`Create an account | ${APP_NAME}`}</title>
      <AuthLayout title="Create an account" description="It takes less than a minute.">
        <div className="flex flex-col gap-6">
          <SignUpForm />
          <p className="text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/signin" className="font-medium text-brand underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
}
