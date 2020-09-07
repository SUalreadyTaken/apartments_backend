import { c24Scrape } from './c24Scrape';
import { kvScrape } from './kvScrape';
import { kvCountyCodeMap, kvParishCodeMap } from '../utils/searchVariables';
import { PseudoCache } from '../models/pseudoCache';
import { Advertisement } from '../models/advertisementModel';
import { AdvertisementI } from '..';
import { devLog } from './../utils/devLogger';
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
const pseudoCache = new PseudoCache();

// push last 200 Adds to pseudoCache
const populateCache = async() => {
		await Advertisement.find({})
			.sort({ date: -1 })
			.limit(200)
			.exec(function (err, docs) {
        // console.log(`docs length > ${docs.length}`);
        pseudoCache.needToAddToCache(docs);
        firstRun = false;
				// devLog(`after init pseudoCache cache len > ${pseudoCache.cache.length}`);
			});
}

export async function runScrape() {
	if (!isScraping) {
    isScraping = !isScraping;
    if (firstRun) await populateCache();

    let url = buildKvUrl(kvCounty, kvParish);
		let kvStart = Date.now();
    // console.log('should only see this after 40 secs');
    const kvResult = await kvScrape(url);
		devLog(`✅ Kv crawling took ${Date.now() - kvStart} ms `);
		let c24Start = Date.now();
		const c24Result = await c24Scrape(Array.from(COUNTY), Array.from(PARISH));
		devLog(`✅ C24 crawling took ${Date.now() - c24Start} ms `);
		const newKvs = pseudoCache.needToAddToCache(kvResult);
		const newC24 = pseudoCache.needToAddToCache(c24Result);
		if (newKvs.length != 0) await addToDb(newKvs);
		if (newC24.length != 0) await addToDb(newC24);

		isScraping = !isScraping;
	}
}

const addToDb = async (newAdds: AdvertisementI[]) => {
  for (const ad of newAdds) {
    try {
			console.log(`found new Add > ${JSON.stringify(ad.adId)} || ${JSON.stringify(ad.url)}`);
			await Advertisement.create(ad);
    } catch (error) {
      console.log(`🔥 ERROR in addToDb 🔥
      ${error}`);
    }
  }
};

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

// https://www.kv.ee/?act=search.simple&last_deal_type=2&company_id=&page=1&orderby=cdwl&page_size=50&deal_type=2&dt_select=2&county=1&search_type=new&parish=1061&rooms_min=&rooms_max=&price_min=200&price_max=500&nr_of_people=&area_min=&area_max=&floor_min=&floor_max=&energy_certs=&keyword=

// https://www.kv.ee/?act=search.simple&last_deal_type=2&company_id=&page=1&orderby=cdwl&page_size=50&deal_type=2&dt_select=2&county=1&search_type=new&parish=1061&city%5B%5D=1003&city%5B%5D=1004&city%5B%5D=1006&rooms_min=&rooms_max=&price_min=200&price_max=500&nr_of_people=&area_min=&area_max=&floor_min=&floor_max=&energy_certs=&keyword=
