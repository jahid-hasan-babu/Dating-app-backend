import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { subscriptionServices } from './subscription.services';

const getMySubscription = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user.id;
    const result = await subscriptionServices.getMySubscription(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription retrieved successfully',
      data: result,
    });
  },
);

export const SubscriptionControllers = {
  getMySubscription,
};
