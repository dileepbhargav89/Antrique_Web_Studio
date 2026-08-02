/** Support contact numbers for the marketing site's floating WhatsApp/call
 * widget (`components/marketing/support-widget.tsx`). `whatsappNumber` is
 * digits-only (E.164 without the leading `+`) — that's the format
 * `wa.me` links require. */
export const SUPPORT_CONTACT = {
  whatsappNumber: '919109059791',
  phoneNumber: '+919109059791',
  whatsappMessage: "Hi! I'd like to know more about your services.",
} as const;
