export function FormError({ message }: { message: string | null }) {
  // The region stays mounted so screen readers announce text when it appears.
  return (
    <div
      role="alert"
      className={
        message ? 'rounded-lg bg-destructive-soft p-3 text-sm text-destructive' : undefined
      }
    >
      {message}
    </div>
  );
}
