import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Naver from 'next-auth/providers/naver';
import Kakao from 'next-auth/providers/kakao';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

/** 첫 로그인 시 기존 provider sub 기반 데이터를 새 DB userId로 마이그레이션 */
async function migrateOldUserData(oldUserId: string, newUserId: string) {
  if (oldUserId === newUserId) return;
  await prisma.$transaction([
    prisma.idea.updateMany({ where: { userId: oldUserId }, data: { userId: newUserId } }),
    prisma.businessPlan.updateMany({ where: { userId: oldUserId }, data: { userId: newUserId } }),
    prisma.pRD.updateMany({ where: { userId: oldUserId }, data: { userId: newUserId } }),
  ]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
    async jwt({ token, user, account }) {
      if (user && account) {
        token.id = user.id;
        // 기존 데이터 마이그레이션 (fire-and-forget)
        migrateOldUserData(account.providerAccountId, user.id!).catch(console.error);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
