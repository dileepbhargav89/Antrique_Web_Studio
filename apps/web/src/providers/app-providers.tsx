import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './auth-provider';
import { GlobalErrorBoundary } from './error-boundary';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}
