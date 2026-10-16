import './globals.css';
import Shell from '@/components/Shell';

export const metadata = { title: 'FP TV 쇼츠 스튜디오', description: '페플TV 롱폼 → 쇼츠 제작과 업무 마인드맵' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Roboto+Slab:wght@400;500;600&display=swap"
        />
      </head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
