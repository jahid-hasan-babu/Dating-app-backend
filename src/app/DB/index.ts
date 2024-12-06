import { UserRoleEnum } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import config from '../../config';
import prisma from '../utils/prisma';

const AdminData = {
  email: 'admin@gmail.com',
  password: '',
  role: UserRoleEnum.ADMIN,
};

const seedAdmin = async () => {
  try {
    // Check if a super admin already exists
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        role: UserRoleEnum.ADMIN,
      },
    });

    // If not, create one
    if (!isSuperAdminExists) {
      AdminData.password = await bcrypt.hash(
        config.admin_password as string,
        Number(config.bcrypt_salt_rounds) || 12,
      );
      await prisma.user.create({
        data: AdminData,
      });
    } else {
      return;
      //   console.log("Super Admin already exists.");
    }
  } catch (error) {
    console.error('Error seeding  Admin:', error);
  }
};

export default seedAdmin;
