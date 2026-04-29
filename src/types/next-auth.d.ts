import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
    };
    communityId: string;
    role: "member" | "admin";
    isVerifiedProvider: boolean;
    phoneVerified: boolean;
    requiresPhoneVerification?: boolean;
  }
}

// next-auth v5 beta uses @auth/core/jwt for JWT augmentation
declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    communityId: string;
    role: "member" | "admin";
    isVerifiedProvider: boolean;
    phoneVerified: boolean;
    requiresPhoneVerification?: boolean;
  }
}
