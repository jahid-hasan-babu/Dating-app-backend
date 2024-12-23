import express from 'express';
import { MessageControllers } from './message.controller';
import auth from '../../middlewares/auth';
const router = express.Router();

router.post('/:userId', auth(), MessageControllers.createMessage);
router.get('/getMyChat', auth(), MessageControllers.getMyChat);

export const Messagerouters = router;
