import express from 'express';
import { AuthRouters } from '../modules/auth/auth.routes';
import { UserRouters } from '../modules/user/user.routes';
import path from 'path';
import { ProfileRouters } from '../modules/profiles/profile.routes';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRouters,
  },
  {
    path: '/users',
    route: UserRouters,
  },
  {
    path: '/profiles',
    route: ProfileRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
