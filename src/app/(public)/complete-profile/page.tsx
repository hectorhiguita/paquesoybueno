import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import { CompleteProfileForm } from "./CompleteProfileForm";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const veredas = await prisma.vereda.findMany({
    where: { communityId: SANTA_ELENA_COMMUNITY_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <CompleteProfileForm veredas={veredas} />;
}
