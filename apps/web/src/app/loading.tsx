import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <Spinner size="lg" label="Loading" />
    </div>
  );
}
