import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

// get my subscription
const getMySubscription = async (userId: string) => {
  const result = await prisma.subscription.findFirst({
    where: {
      userID: userId,
      status: { in: ['active', 'APPROVAL_PENDING'] },
    },
  });
  if (!result) return false;
  return true;
};

export const subscriptionServices = {
  getMySubscription,
};
