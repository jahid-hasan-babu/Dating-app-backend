import { UserRoleEnum } from '@prisma/client'; // Adjust as needed based on your project

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRoleEnum;
      };
    }
  }
}
