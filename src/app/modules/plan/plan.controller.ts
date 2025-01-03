import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PlanServices } from './plan.service';
import { Request, Response } from 'express';

const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await PlanServices.getAllPlans();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Plans Retrieve successfully',
    data: result,
  });
});

const createPlan = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await PlanServices.createPlan(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Plain created successfully!',
    data: result,
  });
});

const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const payload = req.body;
  const result = await PlanServices.updatePlan(payload, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Plain updated successfully!',
    data: result,
  });
});

const payPalaccessToken = catchAsync(async (req: Request, res: Response) => {
  const result = await PlanServices.getAccessToken();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'AccessToken Retrieve successfully',
    data: result,
  });
});

const createPayPalProductAndPlan = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PlanServices.createPayPalProductAndPlan(
      req.body.accessToken,
      req.body.planName,
      req.body.price,
      req.body.description,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'PayPal Product and Plan created successfully',
      data: result,
    });
  },
);

export const PlanControllers = {
  getAllPlans,
  createPlan,
  payPalaccessToken,
  updatePlan,
  createPayPalProductAndPlan,
};
