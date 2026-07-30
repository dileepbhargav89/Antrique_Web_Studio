'use client';

import { LogOutIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/config/routes';
import { authService } from '@/services/auth/auth.service';
import { useAuthStore } from '@/store/auth-store';

function initialsFromEmail(email: string | null): string {
  return email ? email.charAt(0).toUpperCase() : '?';
}

/**
 * Session `email` only — the backend has no `/me` endpoint (a known Backend v1.0 Review
 * Phase 4 finding), so there's no name/avatar/role to show yet. "Log out" is the one real
 * auth action this phase wires up end to end (see `docs/architecture/application-runtime.md`).
 */
function UserMenu() {
  const status = useAuthStore((s) => s.status);
  const email = useAuthStore((s) => s.email);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const router = useRouter();

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      setUnauthenticated();
      router.push(ROUTES.auth.login);
    }
  }

  // Brief window on a hard refresh between the portal shell mounting and
  // `AuthProvider`'s `GET /api/auth/session` resolving — show a real loading state
  // instead of flashing "Unknown user" while `email` is still null.
  if (status === 'loading') {
    return <Skeleton aria-hidden="true" className="size-8 rounded-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <Avatar>
            <AvatarFallback>{initialsFromEmail(email)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-normal">Signed in as</span>
          <span className="truncate text-sm font-medium">{email ?? 'Unknown user'}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOutIcon aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserMenu };
