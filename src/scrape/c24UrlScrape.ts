import puppeteer, { Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { devLog } from './../utils/devLogger';
import { initScrapeDataI } from '.';
import { c24CityPartsSet, c24CityPartsTrimmedMap } from './../utils/searchVariables';
let openedTabs = 0;
let browser: puppeteer.Browser;

// waitFor will be deprecated https://github.com/puppeteer/puppeteer/issues/6214
declare module 'puppeteer' {
  export interface Page {
    waitForTimeout(duration: number): Promise<void>;
  }
}

export async function c24InitScrape(countyList: string[], parishList: string[]): Promise<initScrapeDataI[]> {
	let result: initScrapeDataI[] = [];
	let page: Page;
	// let browser;
	try {
		// // TODO check if browser gives memory problems if not reset
		if (openedTabs === 0) {
			if (browser) await browser.close();
			browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
			openedTabs++;
		} else {
			openedTabs = openedTabs >= 20 ? 0 : openedTabs + 1;
		}
		// browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
		devLog('🕵️‍♂️ Crawling C24 URLs...');
		page = await browser.newPage();
		page.setViewport({ width: 1700, height: 768 });

		await page.goto('https://www.city24.ee/et/nimekiri/uurida/korter?ord=sort-date-desc&c=EE', {
			waitUntil: 'domcontentloaded',
		});
		await page.click('a.openAreaSelect');
		await waitAndLog(page, 'div.firstlist');
		let waitFirst = true;
		let waitFirstCount = 20;
		while (waitFirst && waitFirstCount > 0) {
			await page
				.waitForSelector('div.firstlist', { visible: true, timeout: 1000 })
				.then(() => {
					waitFirst = false;
				})
				.catch(async () => {
					waitFirstCount--;
					await page.click('a.openAreaSelect');
				});
		}

		await clickAreas(page, "//div[@class='firstlist']/ul/li/a", countyList);
		await page.waitForTimeout(200); // leave it
		await clickAreas(page, "//div[@class='secondlist']/ul/li/a", parishList);
		// await clickAreas(page, "//div[@class='secondlist']/ul/li/a", cityPartList);
		await page.waitForTimeout(500); // leave it closing popup
		await page.click('a.button.navSearch');
		await page.waitForTimeout(500); // leave it closing popup
		if (countyList.length != 0 || parishList.length != 0) {
			console.log(`something went wrong arrays need to be empty
      countyList > ${countyList} | parishList > ${parishList}`);
			throw new Error('c24 url scrape arrays not empty');
		}
		// await (await page.$('input[name="priceRangeSearch:minValue"]')).focus();
		// await page.keyboard.type(priceMin, { delay: 25 });
		// await (await page.$('input[name="priceRangeSearch:maxValue"]')).focus();
		// await page.keyboard.type(priceMax, { delay: 25 });

		await page.click('a.searchButton');
		await page
			.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
			.catch(() => console.log('probably 15sec timeout'));
		const content = await page.content();
		const $ = cheerio.load(content);
		const advertisementTable = $('li.new.result.regular');
		advertisementTable.each(function (this: CheerioElement) {
			const combined = $(this).find('a.addressLink');
			const id = combined.attr('name') + '_c24';
			const url = combined.attr('href')?.split('?sel', 1)[0];
			const tmpCityPartsList = combined
				.find('span')
				.text()
				?.split(',')
				.map((e) => e.trim());
			let cityPart = '';
			for (const cp of tmpCityPartsList) {
				if (c24CityPartsSet.has(cp)) {
					cityPart = c24CityPartsTrimmedMap.get(cp);
					break;
				}
			}
			if (url.includes('city24.ee/')) result.push({ url, id, cityPart });
		});
	} catch (error) {
		console.log('🔥 ERROR 🔥');
		console.log(error);
		// process s.exit(1);
	} finally {
		if (page) await page.close();
	}
	return result;
}

const waitAndLog = async (page: Page, selector: string, timeout = 30000) => {
	const start = Date.now();
	let myElement = await page.$(selector);
	while (!myElement) {
		await page.waitForTimeout(250);
		const alreadyWaitingFor = Date.now() - start;
		if (alreadyWaitingFor > timeout) {
			throw new Error(`Waiting for ${selector} timeouted after ${timeout} ms`);
		}
		// devLog(`Waiting for ${selector} for ${alreadyWaitingFor}`);
		myElement = await page.$(selector);
	}
	// devLog(`Selector ${selector} appeared on the page!`);
	return myElement;
};

const clickAreas = async function (page: Page, selector: string, areaList: string[]) {
	let tryCount = 100;
	while (tryCount > 0) {
		try {
			const clickableList = await page.$x(selector);
			for (const t of clickableList) {
				let text = await t.evaluate((element) => element.textContent);
				if (areaList.includes(text)) {
					await t.click();
          await page.waitForTimeout(50);
					areaList.splice(areaList.indexOf(text), 1);
					if (areaList.length === 0) return;
				}
			}
		} catch (error) {
			// console.log(`⚠️ ERROR clickAreas (usually will see 1) ⚠️ ${areaList}`);
			await page.waitForTimeout(1000);
		}
		await page.waitForTimeout(50);
		tryCount--;
	}
};
