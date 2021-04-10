import * as cheerio from 'cheerio';
const axios = require('axios');
import { AdvertisementI } from '..';
import { devLog } from '../utils/devLogger';
import { initScrapeDataI } from '.';
import { kvCityPartsSet, c24CityPartsSet, c24CityPartsTrimmedMap } from './../utils/searchVariables';

export async function kvDataScrape(target: initScrapeDataI): Promise<AdvertisementI | boolean> {
	const res = await fetchData(target.url);
	if (res && res.data) {
		const cheerio$ = isKvAlive(res.data);
		if (cheerio$ !== false) {
			return kvScrape(target, cheerio$ as cheerio.Root);
		}
	}
	return false;
}

export async function c24DataScrape(target: initScrapeDataI): Promise<AdvertisementI | boolean> {
	const res = await fetchData(target.url);
	if (res && res.data) {
		const cheerio$ = isC24Alive(res.data);
		if (cheerio$ !== false) {
			return c24Scrape(target, cheerio$ as cheerio.Root);
		}
	}
	return false;
}

export const isC24Alive = (html: any): cheerio.Root | boolean => {
	const $ = cheerio.load(html, {});
	const h1Title = $('div.container > div.wrapper > div.content > h2').text()?.trim();
  if (h1Title === 'Oihh!') {
		// Ad is deleted.. delete from db
		return false;
  }
  const notActive = $('div.colLeft > div.titleWrapper > div.itemTitle > div.itemTitleColumnLeft > div').text()?.trim();
  if (notActive === 'Kuulutus ei ole aktiivne') {
    // Ad is not active.. delete from db
    return false;
  }

	return $;
};

export const isKvAlive = (html: any): cheerio.Root | boolean => {
	const $ = cheerio.load(html, {});

	// body > div.main-helper > div > div.main-content-wrap > div.hgroup.large > div > h1
	const h1Title = $('div.main-content-wrap > div.hgroup.large > div').text()?.trim();
	if (h1Title === 'Kuulutus on kustutatud') {
		// Ad is deleted.. delete from db
		return false;
	}
	return $;
};

export const c24Scrape = (target: initScrapeDataI, cheerio$: cheerio.Root): AdvertisementI => {
	const $ = cheerio$;

	const cityPartTmp = $('div.colLeft > div.titleWrapper > div.itemTitle > div.itemTitleColumnLeft > h1')
		.text()
		?.split(',')
		.map((e) => e.trim());
	let cityPart = '';
	for (const s of cityPartTmp) {
		if (c24CityPartsSet.has(s)) {
			cityPart = c24CityPartsTrimmedMap.get(s);
		}
	}

	// .last().text() doesn't work
	const tmpTitle = $('div.colLeft > div.titleWrapper > div.itemTitle > div.itemTitleColumnLeft > h1')
		.text()
		?.split('Üürikorterid');
	const title = tmpTitle.length === 2 ? tmpTitle[1] : tmpTitle[0];

	let tmpPrice = $('div.colLeft > div.titleWrapper > div.itemTitle > div.itemTitleColumnRight > span.price').text();
	if (tmpPrice.includes('kuu')) {
		console.log('there is kuu');
		const slashIndex = tmpPrice.indexOf('/');
		if (slashIndex > -1 && slashIndex + 1 <= tmpPrice.length) {
			tmpPrice = tmpPrice
				.substring(slashIndex + 1)
				.split('EUR')[0]
				.replace(' ', '');
			console.log(`after slash >> ${tmpPrice}`);
		}
	} else {
		tmpPrice = tmpPrice?.split('EUR')[0].replace(' ', '');
	}
	console.log(`tmpPrice >> ${tmpPrice}`);
	let price = parseFloat(tmpPrice);

	price = isNaN(price) ? 0 : price;

	const description = $('div.colLeft > div:nth-child(2) > span:nth-child(2) > div > div > h2').first().text();

	const generalInfo = $('div.colLeft > div:nth-child(2) > span:nth-child(2) > div > div > div.factsheet');
	let m2 = parseFloat(
		generalInfo
			.find('table:nth-child(2) > tbody > tr:nth-child(2) > td > span')
			.text()
			?.split(' m')[0]
			.replace(',', '.')
	);
	m2 = isNaN(m2) ? 0 : m2;

	let m2Price = parseFloat(
		$('div.colLeft > div.titleWrapper > div.itemTitle > div.itemTitleColumnRight > span.priceSqrM')
			.text()
			?.split(' EUR')[0]
			.replace(',', '.')
	);
	m2Price = isNaN(m2Price) ? 0 : m2Price;
	
	let buildYear = 0;
	let url = '';
	const child2 = $(
		'div.colLeft > div:nth-child(2) > span:nth-child(2) > div > div > div.factsheet > table:nth-child(2) > tbody > tr'
	);
	child2.each(function (this: cheerio.Element) {
		const tmp = $(this).text()?.trim().split('Ehitusaasta:');
		if (tmp.length === 2) {
			buildYear = isNaN(parseFloat(tmp[1])) ? 0 : parseFloat(tmp[1]);
			// return false; // break
		}
		if (url === '') {
			const tmpUrl = $(this).text()?.trim().split('Otseviide:');
			if (tmpUrl.length === 2) {
				if (tmpUrl[1].includes('city24.ee')) {
					url = tmpUrl[1].trim();
				}
			}
		}
	});
	let energy = '';
	let condition = '';
	let propertyOf = '';
	const child4 = $(
		'div.colLeft > div:nth-child(2) > span:nth-child(2) > div > div > div.factsheet > table:nth-child(4) > tbody > tr'
	);
	child4.each(function (this: cheerio.Element) {
		if (energy === '') {
			const tmpEnergy = $(this).text()?.trim().split('Energiamärgis:');
			if (tmpEnergy.length === 2) energy = tmpEnergy[1].trim();
		}
		if (condition === '') {
			const tmpCondition = $(this).text()?.trim().split('Seisukord:');
			if (tmpCondition.length === 2) condition = tmpCondition[1].trim();
		}
		if (propertyOf === '') {
			const tmpPropertyOf = $(this).text()?.trim().split('Omandivorm:');
			if (tmpPropertyOf.length === 2) propertyOf = tmpPropertyOf[1].trim();
		}
	});

	const child6 = $(
		'div.colLeft > div:nth-child(2) > span:nth-child(2) > div > div > div.factsheet > table:nth-child(6) > tbody > tr'
	);
	let rooms = 0;
	let floor = '';
	child6.each(function (this: cheerio.Element) {
		if (rooms === 0) {
			const tmpRooms = $(this).text()?.trim().split('Tubade arv:');
			if (tmpRooms.length === 2) rooms = isNaN(parseFloat(tmpRooms[1])) ? 0 : parseFloat(tmpRooms[1]);
		}
		if (floor === '') {
			const tmpFloor = $(this).text()?.trim().split('Korrus/Korruseid:');
			if (tmpFloor.length === 2) floor = tmpFloor[1].trim();
		}
	});

  const imgUrl = $('#img1').attr('src') || '';
  
  if (m2Price === 0 && price !== 0 && m2 !== 0) {
    m2Price = price / m2;
  }
  
  if (m2 === 0 && price !== 0 && m2Price !== 0) {
    m2 = price / m2Price;
  }

	return {
		adId: target.id,
		site: 'c24',
		url: url,
		imgUrl: imgUrl,
		title: title,
		rooms: rooms,
		m2: m2,
		price: price,
		m2Price: m2Price,
		description: description,
		cityPart: cityPart,
		floor: floor,
		buildYear: buildYear,
		condition: condition,
		energy: energy,
		propertyOf: propertyOf,
		date: new Date(),
	};
};

export const kvScrape = (target: initScrapeDataI, cheerio$: cheerio.Root): AdvertisementI => {
	const $ = cheerio$;

	const title = $('body > div.main-helper > div > div.main-content-wrap > div.hgroup.large > div > h1').text()?.trim();

	const description = $(
		'body > div.main-helper > div > div.main-content-wrap > div.grid.object-article > div.col-1-2.t-1-2 > div > div.object-article-section > div.object-article-body > h2'
	)
		.text()
		?.trim();
	const imgUrl = $('#obj_main_image').attr('src');

	const tmpCityPart = $('body > div.main-helper > div > div.main-content-wrap > div.hgroup.large > div > h1')
		.text()
		?.split(',')
		.map((e) => e.trim());
	let cityPart = '';
	for (const s of tmpCityPart) {
		if (kvCityPartsSet.has(s)) {
			cityPart = s;
			break;
		}
	}

	let url = $('#object-id-copy').text()?.trim();
	if (url !== '' && url) {
		url = 'https://' + url;
	}

	let price = 0;
	let m2Price = 0;
	let rooms = 0;
	let m2 = 0;
	let floor = '';
	let buildYear = 0;
	let condition = '';
	let propertyOf = '';
	let energy = '';

	const priceAndM2 = $(
		'body > div.main-helper > div > div.main-content-wrap > div.grid.object-article > div.col-1-4.t-1-2 > div > div.object-article-details > div.grid > div > div'
	);
	priceAndM2.each(function (this: cheerio.Element) {
		price = parseFloat(sliceSpaceNonBreakingSpace($(this).children('strong').text()?.trim()));
		// price = parseFloat(sliceSpaceNonBreakingSpace($(this).find('strong').text()?.trim()));
		price = isNaN(price) ? 0 : price;
		m2Price = parseFloat(sliceSpaceNonBreakingSpace($(this).find('span.object-m2-price').text()?.trim()));
		// m2Price = parseFloat(sliceSpaceNonBreakingSpace($(this).find('span').text()?.trim()));
		m2Price = isNaN(m2Price) ? 0 : m2Price;
	});

	const otherData = $(
		'body > div.main-helper > div > div.main-content-wrap > div.grid.object-article > div.col-1-4.t-1-2 > div > div.object-article-details > table > tbody > tr'
	);
	otherData.each(function (this: cheerio.Element) {
		if (rooms === 0) {
			const tmpRooms = $(this).text()?.trim().split('Tube');
			if (tmpRooms.length === 2) rooms = isNaN(parseFloat(tmpRooms[1])) ? 0 : parseFloat(tmpRooms[1]);
		}
		if (m2 === 0) {
			const tmpM2 = $(this).text()?.trim().split('Üldpind');
			if (tmpM2.length === 2) {
				const t = parseFloat(tmpM2[1]?.split(' m')[0]);
				if (!isNaN(t)) m2 = t;
			}
		}
		if (floor === '') {
			const tmpFloor = $(this).text()?.trim().split('Korrus/Korruseid');
			if (tmpFloor.length === 2) floor = tmpFloor[1].trim();
		}
		if (buildYear === 0) {
			const tmpM2 = $(this).text()?.trim().split('Ehitusaasta');
			if (tmpM2.length === 2) buildYear = isNaN(parseInt(tmpM2[1])) ? 0 : parseInt(tmpM2[1]);
		}
		if (condition === '') {
			const tmpCondition = $(this).text()?.trim().split('Seisukord');
			if (tmpCondition.length === 2) condition = tmpCondition[1].trim();
		}
		if (propertyOf === '') {
			const tmpPropertyOf = $(this).text()?.trim().split('Omandivorm');
			if (tmpPropertyOf.length === 2) propertyOf = tmpPropertyOf[1].trim();
		}
		if (energy === '') {
			const tmpEnergy = $(this).text()?.trim().split('Energiamärgis');
			if (tmpEnergy.length === 2) energy = tmpEnergy[1].trim();
		}
  });
  
  if (m2Price === 0 && price !== 0 && m2 !== 0) {
    m2Price = price / m2;
  }

  if (m2 === 0 && price !== 0 && m2Price !== 0) {
    m2 = price / m2Price;
  }

	return {
		adId: target.id,
		site: 'kv',
		url: url,
		imgUrl: imgUrl,
		title: title,
		rooms: rooms,
		m2: m2,
		price: price,
		m2Price: m2Price,
		description: description,
		cityPart: cityPart,
		floor: floor,
		buildYear: buildYear,
		condition: condition,
		energy: energy,
		propertyOf: propertyOf,
		date: new Date(),
	};
};

const sliceSpaceNonBreakingSpace = (s: string) => {
	if (s !== undefined) {
		let temp = s.replace('\xa0', '');
		const index = temp.indexOf('€');
		return index > 0 ? temp.slice(0, index) : temp;
	}
	return s;
};

export async function fetchData(url: string) {
	return await axios(url).catch((err: any) => {
		console.log(`🔥Error axios request ${url} 🔥`);
		if (err.name) console.log(err.name);
	});
}

// (async () => {
// 	// https://www.kv.ee/korter-on-puhas-ja-heas-korras-olemas-koogimoobel-3272925.html
// 	console.time('sss');
// 	const target = {
// 		id: 'asdasd',
// 		// url: 'https://www.kv.ee/3276954',
// 		url: 'https://www.kv.ee/3266628',
// 		cityPart: 'Kesklinn',
// 	};
// 	const test = await kvDataScrape(target);
// 	console.log(test);
// 	console.timeLog('sss', 'kv');

// 	// const target2 = {
// 	// 	id: 'asdasd',
// 	// 	url: 'https://www.city24.ee/et/kinnisvara/korterite-uur/Tallinn-Kesklinna-linnaosa/pc926v?selectedTabMenu=list',
// 	// 	cityPart: 'Kesklinn',
// 	// };
// 	// // // const target2 = {
// 	// // // 	id: 'asdasd',
// 	// // // 	url: 'https://www.city24.ee/et/kinnisvara/korterite-uur/Tallinn-Kesklinna-linnaosa/pct848',
// 	// // // 	cityPart: 'Kesklinn',
// 	// // // };
// 	// const test2 = await c24DataScrape(target2);
// 	// console.timeLog('sss', 'c24');
// 	// console.log('------------');
// 	// console.log(test2);
// })();
