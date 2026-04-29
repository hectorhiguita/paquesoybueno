import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const veredas = await prisma.vereda.findMany({
    where: { communityId: SANTA_ELENA_COMMUNITY_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <RegisterForm veredas={veredas.map((v) => ({ value: v.id, label: v.name }))} />;
}
