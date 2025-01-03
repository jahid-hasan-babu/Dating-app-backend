import express from 'express';
import { AuthRouters } from '../modules/auth/auth.routes';
import { UserRouters } from '../modules/user/user.routes';
import { FavoriteRouters } from '../modules/favorite/favorite.routes';
import { ProfileRouters } from '../modules/profiles/profile.routes';
import { VerifyRouters } from '../modules/verify/verify.routes';
import { Planrouters } from '../modules/plan/plan.routes';
import { PaymentRouters } from '../modules/payment/payment.routes';
import { notificationsRoute } from '../modules/notifications/notification.routes';
import { ChatRoutes } from '../modules/chat/chat.route';
import { SubscriptionRouters } from '../modules/subscription/subscription.route';

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
  {
    path: '/favorites',
    route: FavoriteRouters,
  },
  {
    path: '/verify',
    route: VerifyRouters,
  },
  {
    path: '/plans',
    route: Planrouters,
  },

  {
    path: '/payments',
    route: PaymentRouters,
  },
  {
    path: '/messages',
    route: ChatRoutes,
  },
  {
    path: '/notifications',
    route: notificationsRoute,
  },
  {
    path: '/subscriptions',
    route: SubscriptionRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
