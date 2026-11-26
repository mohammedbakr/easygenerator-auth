import { Link } from 'react-router';
import { AuthLayout } from './AuthLayout';

export function SignUpPage() {
  return (
    <AuthLayout title="Create an account" description="It takes less than a minute.">
      <p className="text-sm text-muted-foreground">
        Already registered?{' '}
        <Link to="/signin" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
