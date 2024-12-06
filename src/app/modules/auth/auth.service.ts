import * as bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { generateToken } from '../../utils/generateToken';
import prisma from '../../utils/prisma';
import sentEmailUtility from '../../utils/sentEmailUtility';

const loginUser = async (payload: { email: string; password: string }) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });
  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    userData.password as string,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  const accessToken = await generateToken(
    {
      id: userData.id,
      email: userData.email as string,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as string,
  );
  return {
    id: userData.id,
    email: userData.email,
    role: userData.role,
    accessToken: accessToken,
  };
};

const createOtp = async (payload: { email: string }) => {
  // Check if the user exists
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (!userData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  const EmailSubject = 'OTP Verification';
  const EmailText = `Your OTP is = ${otp}`;

  // Send email
  await sentEmailUtility(payload.email, EmailSubject, EmailText);

  // Upsert OTP
  const otpData = await prisma.otp.upsert({
    where: { email: payload.email },
    update: { otp },
    create: { email: payload.email, otp },
  });

  return {
    otpData,
  };
};
export const AuthServices = { loginUser, createOtp };



