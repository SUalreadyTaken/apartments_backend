import * as cheerio from 'cheerio';
const axios = require('axios');
// import { kvCityPartsSet } from '../utils/searchVariables';
// import { AdvertisementI } from '..';
import { devLog } from './../utils/devLogger';
import { initScrapeDataI } from '.';
import { kvCityPartsSet } from './../utils/searchVariables';

export async function kvInitScrape(url: string) {
	return mainFunc(url);
}

const mainFunc = async (url: string): Promise<initScrapeDataI[]> => {
	let result: initScrapeDataI[] = [];
	// let result: AdvertisementI[] = [];
	let res = await fetchData(url);
	if (!res || !res.data) {
		console.log(`🔥 invalid url ${url}`);
		// @ts-ignore
		return result;
	}
	const html = res.data;

	const $ = cheerio.load(html, {
		// normalizeWhitespace: true,
		// xmlMode: true
	});

	const advertisementTable = $('div.object-list-table-wrap > table > tbody > tr');

	advertisementTable.each(function (this: CheerioElement) {
		// ads dont have id
		if ($(this).attr('id')) {
			const id = $(this).attr('id') + '_kv';
			const url = $(this).find('td.object-name > h2 > a').attr('href')?.split('?nr', 1)[0];
			const tmpCityPart = $(this)
				.find('a.object-title-a.text-truncate')
				.text()
				?.split(',')
				.map((e) => e.trim());
			let cityPart = '';
			for (const t of tmpCityPart) {
				if (kvCityPartsSet.has(t)) {
					cityPart = t;
					break;
				}
			}
			if (url.includes('kv.ee/')) result.push({ url, id, cityPart });
		}
	});
	return result;
};

// const sliceSpaceNonBreakingSpace = (s: string) => {
// 	// 1000 is written as 1 000
// 	return s.replace('\xa0', '').replace('€', '');
// 	// return s.indexOf('\xa0') > - 1 ? s.slice(0, s.indexOf('\xa0')) : s;
// };

// const sliceSpace = (s: string) => {
// 	// 1000 is written as 1 000
// 	return s.replace(' ', '').replace('€', '');
// 	// return s.indexOf(' ') > - 1 ? s.slice(0, s.indexOf(' ')) : s;
// };

async function fetchData(url: string) {
	devLog('🕵️‍♂️ Crawling KV URLs...');
	return await axios(url).catch((err: any) => {
    console.log(`🔥Error kv axios request ${url}🔥`);
    if (err.code) console.log(err.code);
		// console.log(err);
	});
}
