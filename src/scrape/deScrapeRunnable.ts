import { kvCountyCodeMap, kvParishCodeMap } from '../utils/searchVariables';
import { PseudoCache } from '../models/pseudoCache';
import { Advertisement, IAdvertisement } from '../models/advertisementModel';
import { AdvertisementI } from '..';
import { devLog } from './../utils/devLogger';
import { kvInitScrape, c24InitScrape } from './urlScrape';
import { kvDataScrape, c24DataScrape, fetchData, isKvAlive, kvScrape, isC24Alive, c24Scrape } from './dataScrape';
import { app } from './../app';
import { EventEmitter } from 'events';
import * as cheerio from 'cheerio';
const sleep = require('util').promisify(setTimeout);
const apartmentEmitter: EventEmitter = app.get('apartmentEmitter');

// let firstRun = true;
// TODO these will later come from db.. users search
const COUNTY = ['Harju maakond'];
const PARISH = ['Tallinn'];
const kvCounty = 'Harju maakond';
const kvParish = 'Tallinn';
// let CITY_PART = ['Kesklinna linnaosa', 'Kristiine linnaosa', 'Lasnamäe linnaosa', 'Mustamäe linnaosa'];
// const PRICE_MIN = '200';
// const PRICE_MAX = '500';

let isScraping: boolean = false;
let isUpdateing: boolean = false;
const pseudoCache = new PseudoCache();

// push last 200 Adds to pseudoCache
export const populatePseudoCache = async () => {
	console.log('Populating PseudoCache');
	await Advertisement.find({})
		.sort({ date: -1 })
		.limit(200)
		.exec(function (err, docs) {
			pseudoCache.needToAddToCache(docs);
		});
};

export async function runDataUpdate() {
	if (!isUpdateing) {
		isUpdateing = !isUpdateing;
		const allDb = await Advertisement.find({}, { _id: 0, __v: 0 }).exec();
		for (const oldData of allDb) {
			const target = { id: oldData.adId, url: oldData.url, cityPart: oldData.cityPart };
			const searching = oldData.adId;
			if (oldData.site === 'kv') {
				const res = await fetchData(target.url);
				if (res && res.data) {
					const cheerio$ = isKvAlive(res.data);
					if (typeof cheerio$ !== 'boolean') {
					// if (cheerio$ !== false) {
						const data = kvScrape(target, cheerio$);
						await equality(data, oldData, searching);
					} else {
						await Advertisement.deleteOne({ adId: searching }).exec();
						console.log(`❎Deleted ad ❎ ${searching}`);
						pseudoCache.removeFromCache(searching);
					}
				}
			} else {
				const res = await fetchData(target.url);
				if (res && res.data) {
					const cheerio$ = isC24Alive(res.data);
					if (typeof cheerio$ !== 'boolean') {
					// if (cheerio$ !== false) {
						const data = c24Scrape(target, cheerio$);
						await equality(data, oldData, searching);
					} else {
						await Advertisement.deleteOne({ adId: searching }).exec();
						console.log(`❎Deleted ad ❎ ${searching}`);
						pseudoCache.removeFromCache(searching);
					}
				}
			}
			await sleep(1500);
		}
		isUpdateing = !isUpdateing;
	}
}

export async function runScrape() {
	if (!isScraping) {
		devLog(`
    -------------------------------------------
    `);
		isScraping = !isScraping;
		let kvStart = Date.now();
    const kvUrl = buildKvUrl(kvCounty, kvParish);
    const c24Url = 'https://www.city24.ee/et/nimekiri/uurida/korter?ord=sort-date-desc&c=EE';
		const kvInitResult = await kvInitScrape(kvUrl);
		devLog(`✅ Kv crawling took ${Date.now() - kvStart} ms `);
		let c24Start = Date.now();
		const c24InitResult = await c24InitScrape(c24Url);
		devLog(`✅ C24 crawling took ${Date.now() - c24Start} ms `);
		const newKvs = pseudoCache.inCache(kvInitResult);
		const newC24s = pseudoCache.inCache(c24InitResult);
		if (newKvs.length != 0) {
			for (const target of newKvs) {
				const data = await kvDataScrape(target);
				if (data !== false) {
					await addToDb(data as AdvertisementI);
				}
			}
		}
		if (newC24s.length != 0) {
			for (const target of newC24s) {
				const data = await c24DataScrape(target);
				if (data !== false) {
					await addToDb(data as AdvertisementI);
				}
			}
		}
		devLog(`✅ Run finished ${Date.now() - kvStart} ms `);
		isScraping = !isScraping;
	}
}

const addToDb = async (newAd: AdvertisementI) => {
	try {
		console.log(`found new Add > ${newAd.adId} || ${newAd.url}`);
		await new Advertisement(newAd).save();
		apartmentEmitter.emit('newApartment', newAd);
	} catch (error) {
		console.log(`🔥 ERROR in addToDb `);
		console.log(`${error}`);
		//E11000 duplicate key error collection
		if (error.code === 11000) {
			console.log(`Duplicate id trying to update`);
      const searching = newAd.adId;
			const oldData = await Advertisement.findOne({ adId: searching }).exec();
			await equality(newAd, oldData, searching);
			pseudoCache.cache.push({ id: newAd.adId, url: newAd.url, cityPart: newAd.cityPart });
		}
	}
};

const propertyCheck = (latest: any, old: any) => {
	if (latest !== undefined && latest !== '') {
		if (old === undefined) {
			console.log(`old > '${old}'\nlatest > '${latest}'`);
			return false;
		} else {
			if (latest !== old) {
				console.log('old is not new');
				console.log(`old > '${old}'\nlatest > '${latest}'`);
				return false;
			}
		}
	}
	if (old !== undefined && latest === undefined) {
		console.log('latest is undefined');
		console.log(`old > '${old}'\nlatest > '${latest}'`);
		return false;
	}
	return true;
};

// TODO simpelton version atm
const checkEquality = (latest: AdvertisementI, old: AdvertisementI): boolean => {
	if (!propertyCheck(latest.url, old.url)) {
    // TODO true.. need to delete old and insert new.. for order purposes.. or just update date too
    // double check.. return false and check url in equality function
    // remove it from here.. new apartment should have dif data so should return false either way
    console.log(`🔥🔥🔥 need to delete and insert new.. site uses old ids for new ads`);
		console.log(`old > ${old.url} | new > ${latest.url}`);
		return false;
	}
	if (!propertyCheck(latest.rooms, old.rooms)) {
		apartmentEmitter.emit('newApartment', latest);
		return false;
	}
	if (!propertyCheck(latest.m2, old.m2)) {
		apartmentEmitter.emit('newApartment', latest);
		return false;
	}
	if (!propertyCheck(latest.price, old.price)) {
		apartmentEmitter.emit('newApartment', latest);
		return false;
	}
	if (!propertyCheck(latest.m2Price, old.m2Price)) {
		apartmentEmitter.emit('newApartment', latest);
		return false;
	}
	if (!propertyCheck(latest.cityPart, old.cityPart)) return false;
	if (!propertyCheck(latest.imgUrl, old.imgUrl)) return false;
	if (!propertyCheck(latest.title, old.title)) return false;
	if (!propertyCheck(latest.floor, old.floor)) return false;
	if (!propertyCheck(latest.description, old.description)) return false;
	if (!propertyCheck(latest.condition, old.condition)) return false;
	if (!propertyCheck(latest.energy, old.energy)) return false;
	if (!propertyCheck(latest.propertyOf, old.propertyOf)) return false;
	if (!propertyCheck(latest.buildYear, old.buildYear)) return false;

	return true;
};

async function equality(data: AdvertisementI, oldData: IAdvertisement, searching: string) {
	if (!checkEquality(data, oldData)) {
		// const searching = oldData.adId;
		console.log(searching);
		data.date = oldData.date; // keep added date
		await Advertisement.updateOne({ adId: searching }, data).exec();
	}
}

// check can only search by 1 county/parish
function buildKvUrl(county: string, parish: string): string {
	let result =
		'https://www.kv.ee/?act=search.simple&last_deal_type=2&company_id=&page=1&orderby=cdwl&page_size=50&deal_type=2&dt_select=2&keyword=&search_type=new';
	if (kvCountyCodeMap.has(county)) {
		result += '&county=' + kvCountyCodeMap.get(county);
	}
	if (kvParishCodeMap.has(parish)) {
		result += '&parish=' + kvParishCodeMap.get(parish);
	}
	return result;
}

// ---------------------

// https://www.kv.ee/?act=search.simple&last_deal_type=2&company_id=&page=1&orderby=cdwl&page_size=50&deal_type=2&dt_select=2&county=1&search_type=new&parish=1061&rooms_min=&rooms_max=&price_min=200&price_max=500&nr_of_people=&area_min=&area_max=&floor_min=&floor_max=&energy_certs=&keyword=

// https://www.kv.ee/?act=search.simple&last_deal_type=2&company_id=&page=1&orderby=cdwl&page_size=50&deal_type=2&dt_select=2&county=1&search_type=new&parish=1061&city%5B%5D=1003&city%5B%5D=1004&city%5B%5D=1006&rooms_min=&rooms_max=&price_min=200&price_max=500&nr_of_people=&area_min=&area_max=&floor_min=&floor_max=&energy_certs=&keyword=

// ---------------------

// if (newKvs.length != 0) {
// 	for (const target of newKvs) {
// 		const kvHtml = await fetchData(target.url);
// 		if (kvHtml.data) {
// 			const cheerio$ = isKvAlive(kvHtml.data);
// 			if (cheerio$ !== false) {
// 				addToDb(kvScrape(target, cheerio$ as CheerioStatic));
// 			}
// 		}
// 	}
// }
// if (newC24s.length != 0) {
// 	for (const target of newC24s) {
// 		const kvHtml = await fetchData(target.url);
// 		if (kvHtml.data) {
// 			const cheerio$ = isC24Alive(kvHtml.data);
// 			if (cheerio$ !== false) {
// 				addToDb(c24Scrape(target, cheerio$ as CheerioStatic));
// 			}
// 		}
// 	}
// }

// ---------------------

// if (oldData.site === 'kv') {
// 	const data = await kvDataScrape(target);
// 	await equality(data, oldData);
// } else {
// 	const data = await c24DataScrape(target);
// 	await equality(data, oldData);
// }

// ---------------------

// const getKeyValue = <U extends keyof T, T extends object>(key: U) => (obj: T) => obj[key];

// const checkEquality = (latest: AdvertisementI, old: AdvertisementI): boolean => {
//   for (const key of Object.keys(old)) {
// // f typescripts Argument of type 'string' is not assignable to parameter of type '"adId"
//     const a = getKeyValue<keyof AdvertisementI, AdvertisementI>(key)(old);
//     // if (latest[key] !== old[key]) {
// 		// 	return false;
// 		// }
// 	}
// 	return true;
// };
