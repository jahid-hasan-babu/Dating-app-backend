import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';

const registerProfile = async (payload: any) => {
  try {
    // Check if a profile already exists for the given userId
    const existingProfile = await prisma.profile.findUnique({
      where: {
        userId: payload.userId,
      },
    });

    if (existingProfile) {
      throw new Error('A profile already exists for this user.');
    }

    // Create the profile if no matching profile exists
    const result = await prisma.profile.create({
      data: payload,
    });

    return result;
  } catch (error: any) {
    throw new Error(error.message || 'Error registering profile');
  }
};

const getAllProfiles = async (req: Request) => {
  const { search } = req.query;
  const searchFilters = search ? searchFilter(search as string) : {};
  const result = await prisma.profile.findMany({
    where: searchFilters,
  });
  return result;
};

const getSingleProfile = async (userId: string) => {
  const result = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
  });
  return result;
};

const updateProfile = async (userId: string, payload: any) => {
  const result = await prisma.profile.update({
    where: {
      userId: userId,
    },
    data: payload,
  });
  return result;
};

const deleteProfile = async (userId: string) => {
  await prisma.profile.delete({
    where: {
      userId: userId,
    },
  });

  // Delete the user associated with the same userId
  const result = await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return;
};

// const searchProfile = async (searchKey: string) => {
//   // Build the dynamic where clause for country and city
//   const whereClause: Prisma.ProfileWhereInput = {
//     OR: [
//       { country: { contains: searchKey, mode: 'insensitive' } },
//       { city: { contains: searchKey, mode: 'insensitive' } },
//     ],
//   };

//   // Perform the query
//   const result = await prisma.profile.findMany({
//     where: whereClause,
//   });

//   // Return the result
//   return { status: 'success', data: result };
// };

export const ProfileServices = {
  registerProfile,
  getAllProfiles,
  getSingleProfile,
  updateProfile,
  deleteProfile,
};
