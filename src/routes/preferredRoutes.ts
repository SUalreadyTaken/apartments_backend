import express from 'express';
import { protect } from '../controllers/userController';
import { testtest } from '../controllers/preferredController';
const router = express.Router();

router.route('/').get(protect, testtest);


export const preferredRoutes = router;