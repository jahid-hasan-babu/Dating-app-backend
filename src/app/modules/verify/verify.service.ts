import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import sentEmailUtility from '../../utils/sentEmailUtility';

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
const verifyOtp = async (userID: string, email: string, otp: number) => {
  console.log('Received Payload:', { email, otp });

  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is required');
  }

  const otpData = await prisma.otp.findUniqueOrThrow({
    where: {
      email: email,
    },
  });

  // Validate OTP
  if (otpData.otp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  // Remove the OTP after successful verification
  await prisma.otp.delete({
    where: {
      email: email,
    },
  });

  await prisma.profile.update({
    where: {
      userId: userID, // Ensure this matches the Prisma schema field name
    },
    data: {
      isVerified: 'VERIFIED', // Set the value for `isVerified`
    },
  });

  return;
};

const verifyUser = async (userID: string) => {
  await prisma.profile.update({
    where: {
      userId: userID,
    },
    data: {
      isVerified: 'VERIFIED',
    },
  });
};

export const VerifyServices = { createOtp, verifyOtp, verifyUser };
