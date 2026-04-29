export const SANTA_ELENA_COMMUNITY_ID = "00000000-0000-0000-0000-000000000001";

export const API_HEADERS = (communityId: string, userId?: string) => ({
  "Content-Type": "application/json",
  "X-Community-ID": communityId,
  ...(userId ? { "X-User-ID": userId } : {}),
});
