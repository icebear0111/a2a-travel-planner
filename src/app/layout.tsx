import type { Metadata } from 'next';
// Next.js 최적화 폰트 불러오기
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css'; // 👈 글로벌 스타일 임포트 필수!

// 폰트 설정
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta', // CSS 변수로 사용
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'A2A Travel Planner',
  description: 'AI-Powered Travel Planning',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${jakarta.variable} ${playfair.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
