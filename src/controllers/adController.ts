const router = require('express').Router();
import { Advertisement, IAdvertisement } from '../models/advertisementModel';
import { catchAsync } from '../utils/catchAsync';
import { AdvertisementI } from '..';
import { NextFunction, Response, Request } from 'express';

// @ts-ignore
router.get('/', (req, res) => {
  res.send({ date: Date.now() });
});

router.get('/duplicates', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const ads = await Advertisement.find().lean().exec();
  console.log(`Ads in db count ${ads.length}`);
  for (let i = 0; i < ads.length - 1; i++) {
    for (let j = i + 1; j < ads.length; j++) {
      if (ads[i].adId == ads[j].adId) {
        console.log(`🔥 Duplicate found i > ${JSON.stringify(ads[i])} || j > ${JSON.stringify(ads[j])}`);
      }
    }
  }
  res.send({done: Date.now()});
}));

router.get('/search', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // let result: IAdvertisement[] = [];
  let result = [];
  console.log(req.body);
  let q = Advertisement.find();
  if (req.body['minPrice']) {
    q.where('price').gte(req.body.minPrice);
  }
  if (req.body.maxPrice) {
    q.where('price').lte(req.body.maxPrice);
  }
  result = await q.lean().exec();
  res.send({time: Date.now(), result});

}));


module.exports = router;
