import express from 'express';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cors from 'cors';
import { runScrape } from './scrape/scrapeRunnable';
const request = require('request');
const sleep = require('util').promisify(setTimeout);
const cookieParser = require('cookie-parser');
// const fetch = require('node-fetch');
const adController = require(`${__dirname}/controllers/adController.ts`);
export const app = express();

app.enable('trust proxy');
app.use(cors());
app.options('*', cors());
// duplicate.. needed for test
import dotenv from 'dotenv';
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

let alternativeBoolean:boolean  = undefined;
if (process.env.USE_ALTERNATIVE_APPS) {
  getAlternativeBoolean();
  setInterval(() => runScrape(), 40000);
  setInterval(() => { if (!alternativeBoolean && alternativeBoolean != undefined) request(process.env.HEROKU_URL + 'ad/');
	}, 240000);
} else {
  setInterval(() => runScrape(), 40000);
	setInterval(() => request(process.env.HEROKU_URL + 'ad/'), 240000);
}

// TODO AlternativeModel
async function getAlternativeBoolean() {
}