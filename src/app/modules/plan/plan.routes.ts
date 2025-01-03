import express from 'express';
import { PlanControllers } from './plan.controller';
import auth from '../../middlewares/auth';
const router = express.Router();

router.post('/', auth(), PlanControllers.createPlan);
router.get('/', auth(), PlanControllers.getAllPlans);
router.post('/getAccessToken', PlanControllers.payPalaccessToken);
router.put('/:id', PlanControllers.updatePlan);
router.post(
  '/createPayPalProductAndPlan',
  PlanControllers.createPayPalProductAndPlan,
);

export const Planrouters = router;
