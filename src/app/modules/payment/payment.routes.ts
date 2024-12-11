import express from 'express';
import { PaymentControllers } from './payment.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ProfileValidation } from './payment.validation';
import { fileUploader } from '../../../helpers/fileUploader';
import auth from '../../middlewares/auth';
const router = express.Router();

router.post('/', auth(), PaymentControllers.cretePayment);

export const PaymentRouters = router;
