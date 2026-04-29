import { Prisma } from "@prisma/client";

export type MessageThreadListItem = Prisma.MessageThreadGetPayload<{
  include: {
    userA: { select: { id: true; name: true } };
    userB: { select: { id: true; name: true } };
    messages: {
      take: 1;
      orderBy: { sentAt: "desc" };
      select: {
        id: true;
        content: true;
        sentAt: true;
        senderId: true;
        delivered: true;
      };
    };
  };
}>;

export type MessageWithSender = Prisma.MessageGetPayload<{
  select: {
    id: true;
    content: true;
    sentAt: true;
    delivered: true;
    sender: { select: { id: true; name: true } };
  };
}>;

export type PublicListingCard = Prisma.ListingGetPayload<{
  include: {
    author: { select: { id: true; name: true; isVerifiedProvider: true; phone: true } };
    category: { select: { id: true; name: true; icon: true } };
    vereda: { select: { id: true; name: true } };
    _count: { select: { ratings: true } };
    ratings: { select: { stars: true } };
  };
}>;
