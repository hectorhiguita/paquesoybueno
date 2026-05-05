import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import { CompleteProfileForm } from "./CompleteProfileForm";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const session = await auth();

  // If the user is authenticated and already verified in DB, send them to dashboard
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phoneVerified: true },
    });
    if (user?.phoneVerified) redirect("/dashboard");
  }

  const veredas = await prisma.vereda.findMany({
    where: { communityId: SANTA_ELENA_COMMUNITY_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <CompleteProfileForm veredas={veredas} />;
}
