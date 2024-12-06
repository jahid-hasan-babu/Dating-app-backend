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
  const userData = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!userData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  const emailSubject = 'OTP Verification';
  const emailText = `Your OTP is: ${otp}`;

  // Send email
  await sentEmailUtility(payload.email, emailSubject, emailText);

  // Upsert OTP (no expiration logic)
  const otpData = await prisma.otp.upsert({
    where: { email: payload.email },
    update: { otp },
    create: { email: payload.email, otp },
  });

  return { otpData };
};

const verifyOtp = async (payload: { email: string; otp: number }) => {
  // Check if the user exists
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (!userData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Check if the OTP is valid
  const otpData = await prisma.otp.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (otpData.otp !== payload.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  // Remove the OTP after successful verification
  await prisma.otp.delete({
    where: {
      email: payload.email,
    },
  });

  return { message: 'OTP verified  successfully' };
};

const resetPassword = async (payload: { email: string; password: string }) => {
  // Check if the user exists
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (!userData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  // Update the user's password
  const updatedUser = await prisma.user.update({
    where: {
      email: payload.email,
    },
    data: {
      password: hashedPassword,
    },
  });

  return updatedUser;
};

export const AuthServices = { loginUser, createOtp, verifyOtp, resetPassword };



