import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import prisma from '../utils/prisma';
import config from '../../config';
import { Secret } from 'jsonwebtoken';
import { verifyToken } from '../utils/verifyToken';
import { Request, Response, NextFunction } from 'express';

const auth = (...roles: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization; // Check the `Authorization` header

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'Authorization token is missing or invalid!',
        );
      }

      const token = authHeader.split(' ')[1];
      console.log(token, 'check from auth');

      // Extract the token part
      if (!token) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Token is missing!');
      }

      const verifyUserToken = verifyToken(
        token,
        config.jwt.access_secret as Secret,
      );

      // Check if user exists in the database
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: verifyUserToken.id },
      });

      req.user = {
        id: verifyUserToken.id,
        role: verifyUserToken.role,
      };

      // Validate roles, if any are specified
      if (roles.length && !roles.includes(verifyUserToken.role)) {
        throw new AppError(httpStatus.FORBIDDEN, 'Access forbidden!');
      }

      next(); // Proceed to the next middleware
    } catch (error) {
      next(error); // Pass error to the error handler
    }
  };
};

export default auth;
