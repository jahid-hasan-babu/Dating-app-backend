import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const getAllPlans = async () => {
  const result = await prisma.plan.findMany();
  return result;
};

const createPlan = async (payload: any) => {
  const result = await prisma.plan.create({
    data: payload,
  });
  return result;
};

export const ProfileServices = {
  getAllPlans,
  createPlan,
};
