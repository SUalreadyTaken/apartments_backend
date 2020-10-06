const router = require('express').Router();
import { Advertisement } from '../models/advertisementModel';
import { catchAsync } from '../utils/catchAsync';
import { NextFunction, Response, Request } from 'express';
import { APIFeatures } from '../utils/apiFeatures';

router.get('/', (req: Request, res: Response) => {
	res.send({ date: Date.now() });
});

router.get(
	'/apartment',
	catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		let filter: any = {};
    
    if (typeof req.query.cityPart === 'string') {
			const tmpCityPart = req.query.cityPart.split(',');
			if (tmpCityPart.length > 1) {
				filter['cityPart'] = { $in: tmpCityPart };
				delete req.query.cityPart;
			}
		}

		const features = new APIFeatures(Advertisement.find(filter), req.query).filter().sort().limitFields().paginate();
		const doc = await features.query;
    
    res.status(200).json({
			status: 'success',
			results: doc.length,
      data: doc,
		});
	})
);

module.exports = router;
