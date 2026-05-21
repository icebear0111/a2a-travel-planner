import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';

const jakarta = localFont({
  src: './fonts/PlusJakartaSans[wght].woff2',
  variable: '--font-jakarta',
  display: 'swap',
  weight: '200 800',
});

const playfair = localFont({
  src: './fonts/PlayfairDisplay[wght].woff2',
  variable: '--font-playfair',
  display: 'swap',
  weight: '400 900',
});

export const metadata: Metadata = {
  title: 'TrAI - AI 여행 플래너',
  description: 'AI가 만들어주는 맞춤 여행 계획',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${jakarta.variable} ${playfair.variable} font-body antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
