export type AppRole = "member" | "admin";

export interface AppSessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface SessionContext {
  userId: string;
  communityId: string;
  role: AppRole;
}
