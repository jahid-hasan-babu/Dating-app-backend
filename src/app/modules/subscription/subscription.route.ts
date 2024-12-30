import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SubscriptionControllers } from './subscription.controller';

const router = Router();

router.get('/', auth(), SubscriptionControllers.getMySubscription);

export const SubscriptionRouters = router;
