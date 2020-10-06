import express from 'express';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cors from 'cors';
const request = require('request');
const sleep = require('util').promisify(setTimeout);
import * as cron from 'node-cron'
const cookieParser = require('cookie-parser');
// const fetch = require('node-fetch');
const adController = require(`${__dirname}/controllers/adController.ts`);
// duplicate.. needed for test
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

export const app = express();

const apartmentEmitter = new EventEmitter();
app.set('apartmentEmitter', apartmentEmitter);
import { runScrape, runDataUpdate } from './scrape/deScrapeRunnable';
import './email/searchPreferred'; // to get it registered

app.enable('trust proxy');
app.use(cors());
app.options('*', cors());
dotenv.config({ path: `${__dirname}/../config.env` });

if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

const limiter = rateLimit({
	max: 100,
	windowMs: 60 * 1000,
	message: 'Too many requests from this IP, please try again in a minute!',
});

app.use(limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/ad', adController);

let alternativeBoolean: boolean = undefined;
// @ts-ignore 
let usingAlternative: boolean = process.env.USE_ALTERNATIVE_APPS;
if (process.env.DEVELOPING === 'no') {
	if (usingAlternative === true) {
    // TODO
    getAlternativeBoolean();
		if (!alternativeBoolean && alternativeBoolean != undefined) {
			cron.schedule('*/1 * * * *', () => {
				runScrape();
				runDataUpdate();
			});
		}
	} else {
    cron.schedule('*/1 * * * *', () => {
      runScrape();
			runDataUpdate();
		});
		cron.schedule('*/4 * * * *', () => request(process.env.HEROKU_URL + 'ad/'));
	}
}

// TODO AlternativeModel
async function getAlternativeBoolean() {
	console.log('todo');
}
