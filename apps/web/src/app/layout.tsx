import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antrique Web Studio',
  description: 'Antrique Web Studio platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
