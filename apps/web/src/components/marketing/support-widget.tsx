import type { SVGProps } from 'react';
import { PhoneIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SUPPORT_CONTACT } from '@/config/contact';

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.44-1.42a9.9 9.9 0 0 0 4.6 1.13h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.55-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.23.85.86-3.15-.19-.32a8.15 8.15 0 0 1-1.26-4.38c0-4.55 3.7-8.25 8.24-8.25zm-4.78 4.35c-.17 0-.45.06-.68.32-.23.26-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.8 2.87 4.45 3.92.62.27 1.1.43 1.48.55.62.2 1.19.17 1.63.1.5-.07 1.53-.62 1.75-1.22.22-.6.22-1.11.15-1.22-.07-.11-.24-.17-.5-.3-.26-.13-1.53-.76-1.77-.84-.24-.09-.41-.13-.59.13-.17.26-.67.84-.82 1.02-.15.17-.3.19-.56.06-.26-.13-1.09-.4-2.08-1.28-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.59-1.44-.82-1.97-.21-.51-.43-.44-.59-.45z" />
    </svg>
  );
}

const widgetLinkClassName = cn(
  'flex size-12 items-center justify-center rounded-full shadow-lg transition-all',
  'hover:-translate-y-0.5 hover:shadow-xl',
  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
);

/**
 * Fixed bottom-right WhatsApp chat + call-support shortcut — marketing site
 * only (pre-sale leads), not the authenticated portal, where clients already
 * have a real account manager. `--z-fixed` (below dropdown/modal/toast
 * layers — see `tokens.css`'s z-index scale) since it only ever needs to sit
 * above page content.
 */
function SupportWidget() {
  const whatsappHref = `https://wa.me/${SUPPORT_CONTACT.whatsappNumber}?text=${encodeURIComponent(SUPPORT_CONTACT.whatsappMessage)}`;
  const callHref = `tel:${SUPPORT_CONTACT.phoneNumber}`;

  return (
    <div className="fixed right-4 bottom-4 z-[var(--z-fixed)] flex flex-col gap-3 sm:right-6 sm:bottom-6">
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with us on WhatsApp"
            className={cn(widgetLinkClassName, 'bg-success text-success-foreground')}
          >
            <WhatsAppIcon className="size-6" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left">Chat on WhatsApp</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={callHref}
            aria-label={`Call support at ${SUPPORT_CONTACT.phoneNumber}`}
            className={cn(widgetLinkClassName, 'bg-primary text-primary-foreground')}
          >
            <PhoneIcon className="size-5" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left">Call support</TooltipContent>
      </Tooltip>
    </div>
  );
}

export { SupportWidget };
