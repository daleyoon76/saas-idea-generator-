import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Naver from 'next-auth/providers/naver';
import Kakao from 'next-auth/providers/kakao';

/**
 * Edge-compatible auth config (middleware용).
 * PrismaAdapter를 import하지 않아 Edge Runtime에서 안전.
 * JWT strategy이므로 session 검증에 DB 불필요.
 */
export const { auth: authMiddleware } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Naver({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
