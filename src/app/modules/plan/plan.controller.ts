import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProfileServices } from './plan.service';
import { Request, Response } from 'express';

const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getAllPlans();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Plans Retrieve successfully',
    data: result,
  });
});

const createPlan = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await ProfileServices.createPlan(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Plain created successfully!',
    data: result,
  });
});

export const PlanControllers = {
  getAllPlans,
  createPlan,
};
