import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}
const registerUser = async (payload: any) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exists');
  }

  // Hash the user's password
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  try {
    // Create the user
    const user = await prisma.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
      },
    });

    // Retrieve user without the password
    const userWithoutPassword = await prisma.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return userWithoutPassword;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error registering user',
      error,
    );
  }
};



const getAllUsers = async () => {
  const result = await prisma.profile.findMany({
    select: {
      id: true,
      userId: true,
      fullName: true,
      username: true,
      phoneNumber: true,
      profileImage: true,
      locationLat: true,
      locationLang: true,
      country: true,
      gender: true,
      dateOfBirth: true,
      height: true,
      interests: true,
      about: true,
      relationship: true,
      language: true,
      work: true,
      gallery: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return result;
};

// const getMyProfileFromDB = async (id: string) => {
//   const Profile = await prisma.user.findUniqueOrThrow({
//     where: {
//       id: id,
//     },
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       role: true,
//       createdAt: true,
//       updatedAt: true,
//       profile: true,
//     },
//   });

//   return Profile;
// };

// const getUserDetailsFromDB = async (id: string) => {
//   const user = await prisma.user.findUniqueOrThrow({
//     where: { id },
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       role: true,
//       createdAt: true,
//       updatedAt: true,
//       profile: true,
//     },
//   });
//   return user;
// };

// const updateMyProfileIntoDB = async (id: string, payload: any) => {
//   const userProfileData = payload.Profile;
//   delete payload.Profile;

//   const userData = payload;

//   // update user data
//   await prisma.$transaction(async (transactionClient: any) => {
//     // Update user data
//     const updatedUser = await transactionClient.user.update({
//       where: { id },
//       data: userData,
//     });

//     // Update user profile data
//     const updatedUserProfile = await transactionClient.Profile.update({
//       where: { userId: id },
//       data: userProfileData,
//     });

//     return { updatedUser, updatedUserProfile };
//   });

//   // Fetch and return the updated user including the profile
//   const updatedUser = await prisma.user.findUniqueOrThrow({
//     where: { id },
//     include: { profile: true },
//   });

//   const userWithOptionalPassword = updatedUser as UserWithOptionalPassword;
//   delete userWithOptionalPassword.password;

//   return userWithOptionalPassword;
// };

// const updateUserRoleStatusIntoDB = async (id: string, payload: any) => {
//   const result = await prisma.user.update({
//     where: {
//       id: id,
//     },
//     data: payload,
//   });
//   return result;
// };

// const changePassword = async (user: any, payload: any) => {
//   const userData = await prisma.user.findUniqueOrThrow({
//     where: {
//       email: user.email,
//       status: 'ACTIVATE',
//     },
//   });

//   const isCorrectPassword: boolean = await bcrypt.compare(
//     payload.oldPassword,
//     userData.password,
//   );

//   if (!isCorrectPassword) {
//     throw new Error('Password incorrect!');
//   }

//   const hashedPassword: string = await bcrypt.hash(payload.newPassword, 12);

//   await prisma.user.update({
//     where: {
//       id: userData.id,
//     },
//     data: {
//       password: hashedPassword,
//     },
//   });

//   return {
//     message: 'Password changed successfully!',
//   };
// };

//register user qservice if user email is exists in db then throw error

// const registerUser = async (payload: { email: string; password: string }) => {
//   // Check if user already exists
//   const existingUser = await prisma.user.findUnique({
//     where: { email: payload.email },
//   });

//   if (existingUser) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'User already exists');
//   }

//   // Hash the user's password
//   const hashedPassword = await bcrypt.hash(payload.password, 12);

//   // Prepare user data
//   const userData = {
//     email: payload.email,
//     password: hashedPassword,
//   };

//   // Create a new user
//   const newUser = await prisma.user.create({
//     data: userData,
//   });

//   return newUser;
// };

// const registerUser = async (payload: any) => {
//   const hashedPassword: string = await bcrypt.hash(payload.password, 12);
//   const userData = {
//     email: payload.email,
//     password: hashedPassword,
//   };
//   const result = await prisma.user.findFirstOrThrow({
//     where: {
//       email: payload.email,
//     },
//   });
//   await prisma.user.create({
//     data: userData,
//   });
//   return result;
// };
export const UserServices = {
  registerUser,
  getAllUsers,
};
