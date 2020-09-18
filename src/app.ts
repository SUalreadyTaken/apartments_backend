import express from 'express';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cors from 'cors';
import { runScrape, runDataUpdate } from './scrape/deScrapeRunnable';
import { EventEmitter } from "events";
const request = require('request');
const sleep = require('util').promisify(setTimeout);
const cookieParser = require('cookie-parser');
// const fetch = require('node-fetch');
const adController = require(`${__dirname}/controllers/adController.ts`);
// duplicate.. needed for test
import dotenv from 'dotenv';
export const app = express();

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

const apartmentEmitter = new EventEmitter();

app.set('apartmentEmitter', apartmentEmitter);

app.use('/ad', adController);

let alternativeBoolean:boolean  = undefined;
// @ts-ignore
let usingAlternative: boolean = process.env.USE_ALTERNATIVE_APPS;
if (process.env.DEVELOPING === 'no') {
  if (usingAlternative === true) {
    getAlternativeBoolean();
    setInterval(() => runScrape(), 40000);
    // will be locked if still updating
    setInterval(() => runDataUpdate(), 60000);
    setInterval(() => { if (!alternativeBoolean && alternativeBoolean != undefined) request(process.env.HEROKU_URL + 'ad/');
  }, 240000);
  } else {
    setInterval(() => runScrape(), 40000);
    // will be locked if still updating
    setInterval(() => runDataUpdate(), 60000);
    setInterval(() => request(process.env.HEROKU_URL + 'ad/'), 240000);
  }
}

// TODO AlternativeModel
async function getAlternativeBoolean() {
  console.log('todo');
}