import { kvCountyCodeMap, kvParishCodeMap } from '../utils/searchVariables';
import { PseudoCache } from '../models/pseudoCache';
import { Advertisement, IAdvertisement } from '../models/advertisementModel';
import { AdvertisementI } from '..';
import { devLog } from './../utils/devLogger';
import { kvInitScrape } from './kvUrlScrape';
import { c24InitScrape } from './c24UrlScrape';
import { kvDataScrape, c24DataScrape, fetchData, isKvAlive, kvScrape, isC24Alive, c24Scrape } from './dataScrape';
const sleep = require('util').promisify(setTimeout);

let firstRun = true;
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
const populateCache = async () => {
	await Advertisement.find({})
		.sort({ date: -1 })
		.limit(200)
		.exec(function (err, docs) {
			// let dbData = docs.map((data) => {
			// 	return { url: data.url, id: data.adId, cityPart: data.cityPart };
			// });
			// pseudoCache.needToAddToCache(dbData);
			pseudoCache.needToAddToCache(docs);
			firstRun = false;
			// devLog(`after init pseudoCache cache len > ${pseudoCache.cache.length}`);
		});
};

export async function runDataUpdate() {
	if (!isUpdateing) {
		isUpdateing = !isUpdateing;
		const allDb = await Advertisement.find({}, { _id: 0, __v: 0, date: 0 }).exec();
		for (const oldData of allDb) {
			const target = { id: oldData.adId, url: oldData.url, cityPart: oldData.cityPart };
			const searching = oldData.adId;
			if (oldData.site === 'kv') {
				const res = await fetchData(target.url);
				if (res.data) {
					const cheerio$ = isKvAlive(res.data);
					if (cheerio$ !== false) {
						const data = kvScrape(target, cheerio$ as CheerioStatic);
						await equality(data, oldData);
					} else {
            await Advertisement.deleteOne({ adId: searching }).exec();
						console.log(`❎Deleted ad ❎ ${oldData.url}`);
						pseudoCache.removeFromCache(oldData.adId);
					}
				}
			} else {
				const res = await fetchData(target.url);
				if (res.data) {
					const cheerio$ = isC24Alive(res.data);
					if (cheerio$ !== false) {
						const data = c24Scrape(target, cheerio$ as CheerioStatic);
						await equality(data, oldData);
					} else {
            await Advertisement.deleteOne({ adId: searching }).exec();
						console.log(`❎Deleted ad ❎ ${oldData.url}`);
						pseudoCache.removeFromCache(oldData.adId);
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
		if (firstRun) await populateCache();

		let url = buildKvUrl(kvCounty, kvParish);
		let kvStart = Date.now();
		// console.log('should only see this after 40 secs');
		const kvInitResult = await kvInitScrape(url);
		devLog(`✅ Kv crawling took ${Date.now() - kvStart} ms `);
		let c24Start = Date.now();
		const c24InitResult = await c24InitScrape(Array.from(COUNTY), Array.from(PARISH));
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
		devLog(`✅ Run finished ${Date.now() - c24Start} ms `);
		isScraping = !isScraping;
	}
}

const addToDb = async (newAd: AdvertisementI) => {
	try {
		console.log(`found new Add > ${newAd.adId} || ${newAd.url}`);
		await new Advertisement(newAd).save();
	} catch (error) {
		console.log(`🔥 ERROR in addToDb `);
		console.log(`${error}`);
		//E11000 duplicate key error collection
		if (error.code === 11000) {
			console.log(`Duplicate id trying to update`);
			const searching = newAd.adId;
			const old = await Advertisement.findOne({ adId: searching }).exec();
			try {
				// console.log(`${JSON.stringify(newAd)}`);
				// console.log(`${old}`);
				if (!checkEquality(newAd, old)) {
					await Advertisement.updateOne({ adId: searching }, newAd).exec();
				}
				pseudoCache.cache.push({ id: newAd.adId, url: newAd.url, cityPart: newAd.cityPart });
			} catch (error) {
				console.log(`🔥 ERROR in addToDb.. updateOne`);
				console.log(`${error}`);
			}
		}
	}
};

const propertyCheck = (latest: any, old: any) => {
	if (latest !== undefined || latest !== '') {
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
		console.log('one is undefined');
		console.log(`old > '${old}'\nlatest > '${latest}'`);
		return false;
	}
	return true;
};

// TODO simpelton version atm
const checkEquality = (latest: AdvertisementI, old: AdvertisementI): boolean => {
	if (!propertyCheck(latest.imgUrl, old.imgUrl)) return false;
	if (!propertyCheck(latest.title, old.title)) return false;
	if (!propertyCheck(latest.rooms, old.rooms)) return false;
	if (!propertyCheck(latest.m2, old.m2)) return false;
	if (!propertyCheck(latest.floor, old.floor)) return false;
	if (!propertyCheck(latest.price, old.price)) return false;
	if (!propertyCheck(latest.m2Price, old.m2Price)) return false;
	if (!propertyCheck(latest.description, old.description)) return false;
	if (!propertyCheck(latest.condition, old.condition)) return false;
	if (!propertyCheck(latest.energy, old.energy)) return false;
	if (!propertyCheck(latest.propertyOf, old.propertyOf)) return false;
	if (!propertyCheck(latest.buildYear, old.buildYear)) return false;

	return true;
};

// const checkEquality = (latest: AdvertisementI, old: AdvertisementI): boolean => {
//   if (aaa(latest.imgUrl, old.imgUrl)) return false;
//   if (latest.title && latest.title !== old.title) return false;
//   if (latest.rooms && latest.rooms !== old.rooms) return false;
//   if (latest.m2 && latest.m2 !== old.m2) return false;
//   if (latest.floor && latest.floor !== old.floor) return false;
//   if (latest.price && latest.price !== old.price) return false;
//   if (latest.m2Price && latest.m2Price !== old.m2Price) return false;
//   if (latest.description && latest.description !== old.description) return false;
//   if (latest.condition && latest.condition !== old.condition) return false;
//   if (latest.energy && latest.energy !== old.energy) return false;
//   if (latest.propertyOf && latest.propertyOf !== old.propertyOf) return false;
//   if (latest.buildYear && latest.buildYear !== old.buildYear) return false;

//   return true;
//   // return JSON.stringify(latest) === JSON.stringify(old);
// };

async function equality(data: AdvertisementI, oldData: IAdvertisement) {
	if (!checkEquality(data as AdvertisementI, oldData)) {
		// devLog(`newData `);
		// devLog(`${JSON.stringify(data)}`);
		// devLog(`oldData `);
		// devLog(`${oldData}`);
		const searching = oldData.adId;
		await Advertisement.updateOne({ adId: searching }, data as AdvertisementI).exec();
		// just check .. delete later
		// const newInDb = await Advertisement.findOne({ adId: searching }).exec();
		// console.log(`new in db `);
		// console.log(`${JSON.stringify(newInDb)}`);
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
