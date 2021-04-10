import {defaultGet, getApartments} from '../controllers/adController';
import express from 'express';
const router = express.Router();

router.get('/', defaultGet);
router.get('/apartment', getApartments);

export const advertisementRoutes = router;
// module.exports = router;