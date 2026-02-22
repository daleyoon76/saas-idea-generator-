import type { Metadata } from "next";
import { Outfit, Noto_Sans_KR, Geist_Mono } from "next/font/google";
import "./globals.css";

// 영문 — 기하학적 모던 산세리프
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

// 한국어 — 산세리프
const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// 코드 블록용 모노스페이스
const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaaS Idea Generator — AI 사업기획서 자동 생성",
  description: "키워드 입력 하나로 시장 조사부터 13섹션 사업기획서까지. 4개의 전문 AI 에이전트가 자동 완성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${outfit.variable} ${notoSansKR.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
