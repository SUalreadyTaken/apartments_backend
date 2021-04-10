import express from 'express';
import { login, signup, getUser, protect, forgotPassword, resetPassword } from '../controllers/userController';
const router = express.Router();

// router.get('/user', defaultGet);
// router.get('/apartment', getApartments);
router.route('/').get(protect, getUser);
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.post('/resetPassword', resetPassword);

export const userRoutes = router;