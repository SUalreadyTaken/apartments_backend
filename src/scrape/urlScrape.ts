import * as cheerio from 'cheerio';
const axios = require('axios');
import { devLog } from '../utils/devLogger';
import { initScrapeDataI } from '.';
import { kvCityPartsSet } from '../utils/searchVariables';
import { c24CityPartsSet, c24CityPartsTrimmedMap } from '../utils/searchVariables';

async function fetchData(url: string) {
  if (url.split('www.').pop().split('.ee')[0] === 'kv') {
    devLog('🕵️‍♂️ Crawling KV URLs...');
  } else {
    devLog('🕵️‍♂️ Crawling C24 URLs...');
  }
	return await axios(url).catch((err: any) => {
		console.log(`🔥Error kv axios request ${url}🔥`);
		if (err.code) console.log(err.code);
		// console.log(err);
	});
}

function getKvData(advertisementTable: cheerio.Cheerio, $: cheerio.Root, result: initScrapeDataI[]) {
	advertisementTable.each(function (this: cheerio.Element) {
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
}

function getC24Data(advertisementTable: cheerio.Cheerio, $: cheerio.Root, result: initScrapeDataI[]) {
	advertisementTable.each(function (this: cheerio.Element) {
		const combined = $(this).find('a.addressLink');
		const id = combined.attr('name') + '_c24';
		const url = combined.attr('href')?.split('?sel', 1)[0];
		const tmpCityPartsList = combined
			.find('span')
			.text()
			?.split(',')
			.map((e: string) => e.trim());
		let cityPart = '';
		for (const cp of tmpCityPartsList) {
			if (c24CityPartsSet.has(cp)) {
				cityPart = c24CityPartsTrimmedMap.get(cp);
				break;
			}
		}
		if (url.includes('city24.ee/') && cityPart !== '') {
			result.push({ url, id, cityPart });
		}
	});
}

export async function kvInitScrape(url: string): Promise<initScrapeDataI[]> {
	let result: initScrapeDataI[] = [];
	let res = await fetchData(url);
	if (!res || !res.data) {
		// console.log(`🔥 invalid url ${url}`);
		// @ts-ignore
		return result;
	}

	const html = res.data;
	const $ = cheerio.load(html, {});

	const advertisementTable = $('div.object-list-table-wrap > table > tbody > tr');
	getKvData(advertisementTable, $, result);
	return result;
}

export async function c24InitScrape(url: string): Promise<initScrapeDataI[]> {
	let result: initScrapeDataI[] = [];
	let res = await fetchData(url);
	if (!res || !res.data) {
		// console.log(`🔥 invalid url ${url}`);
		// @ts-ignore
		return result;
	}
	const html = res.data;
	const $ = cheerio.load(html);

	const advertisementTable = $('li.new.result.regular');

	getC24Data(advertisementTable, $, result);
	return result;
}
