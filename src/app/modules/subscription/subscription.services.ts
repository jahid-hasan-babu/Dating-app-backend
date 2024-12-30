import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();

// get my subscription
const getMySubscription = async (userId: string) => {
  const result = await prisma.subscription.findFirst({
    where: {
      userID: userId,
      status: { in: ['active', 'APPROVAL_PENDING'] },
    },
  });
  return result;
};

export const subscriptionServices = {
  getMySubscription,
};
