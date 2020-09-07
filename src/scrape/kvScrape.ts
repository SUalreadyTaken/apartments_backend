import * as cheerio from 'cheerio';
const axios = require('axios');
import { kvCityPartsSet } from '../utils/searchVariables';
import { AdvertisementI } from '..';
import { devLog } from './../utils/devLogger';

export async function kvScrape(url: string) {
	return mainFunc(url);
}

const mainFunc = async (url: string) => {
	let result: AdvertisementI[] = [];
	let res = await fetchData(url);
	if (!res.data) {
		devLog('Invalid data Obj');
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
			const id = $(this).attr('id');
			const tmpCityPart = $(this)
				.find('a.object-title-a.text-truncate')
				.text()
				.split(',')
				.map((e) => e.trim());
			let cityPart = '';
			for (const t of tmpCityPart) {
				if (kvCityPartsSet.has(t)) {
					cityPart = t;
					break;
				}
			}
			const adUrl = $(this).find('td.object-name > h2 > a').attr('href').split('?nr')[0];
			const imgUrl = $(this).find('img.image_lazy').attr('data-original');
			const title = $(this).find('a.object-title-a').text().trim();
			const rooms = $(this).find('td.object-rooms').text();
			const added = $(this).find('p.object-added-date').text().trim();
			let m2 = $(this).find('td.object-m2').text().trim();
			let price = $(this).find('p.object-price-value').text().trim();
			let m2Price = $(this).find('span.object-m2-price').text().trim();
			m2 = sliceSpaceNonBreakingSpace(m2);
			price = sliceSpaceNonBreakingSpace(price);
			m2Price = sliceSpace(m2Price);
			const description = $(this).find('p.object-excerpt').text().trim().replace(/\s+/g, ' ');
			// devLog(
			// 	`url ${adUrl}\nid: ${id}\nimgUrl: ${imgUrl}\ntitle: ${title}\ncity-part: ${cityPart}\nrooms: ${rooms}\nsurface: ${m2}\nadded: ${added}\nprice: ${price}\nm2: ${m2Price}\ndescription: ${description}`
			// );
			// devLog(`-------------`);
			if (adUrl.includes('kv.ee')) {
				result.push({
					adId: id,
					site: 'kv',
					url: adUrl,
					imgUrl: imgUrl,
					title: title,
					cityPart: cityPart,
					rooms: parseInt(rooms) | 0,
					m2: parseFloat(m2) | 0,
					price: parseFloat(price) | 0,
					m2price: parseFloat(m2Price) | 0,
					description: description,
				});
			}
		}
	});
	return result;
};

const sliceSpaceNonBreakingSpace = (s: string) => {
	// 1000 is written as 1 000
	return s.replace('\xa0', '').replace('€', '');
	// return s.indexOf('\xa0') > - 1 ? s.slice(0, s.indexOf('\xa0')) : s;
};

const sliceSpace = (s: string) => {
	// 1000 is written as 1 000
	return s.replace(' ', '').replace('€', '');
	// return s.indexOf(' ') > - 1 ? s.slice(0, s.indexOf(' ')) : s;
};

async function fetchData(url: string) {
	devLog('🕵️‍♂️ Crawling KV data...');
	return await axios(url).catch((err: any) => {
		console.log(`🔥Error kv axios request 🔥`);
		// console.log(err);
	});
}
