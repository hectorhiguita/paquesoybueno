import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import { NewListingForm } from "./NewListingForm";

export const dynamic = "force-dynamic";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const [categories, veredas] = await Promise.all([
    prisma.category.findMany({
      where: { communityId: SANTA_ELENA_COMMUNITY_ID, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.vereda.findMany({
      where: { communityId: SANTA_ELENA_COMMUNITY_ID },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const initialType =
    searchParams.type && ["service", "sale", "trade", "tool"].includes(searchParams.type)
      ? searchParams.type
      : "service";

  return (
    <NewListingForm
      initialType={initialType}
      categories={categories.map((c) => ({
        value: c.id,
        label: `${c.icon ?? "🔧"} ${c.name}`,
      }))}
      veredas={veredas.map((v) => ({ value: v.id, label: v.name }))}
    />
  );
}
