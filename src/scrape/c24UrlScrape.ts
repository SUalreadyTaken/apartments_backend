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
	try {
		if (openedTabs === 0) {
			if (browser) await browser.close();
			browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
			openedTabs++;
		} else {
			openedTabs = openedTabs >= 10 ? 0 : openedTabs + 1;
		}
		devLog('🕵️‍♂️ Crawling C24 URLs...');
		page = await browser.newPage();
		page.setViewport({ width: 1700, height: 768 });
    await page.setRequestInterception(true);
    page.on('request', handleInterceptedRequests);
    
    await page.goto('https://www.city24.ee/et/nimekiri/uurida/korter?ord=sort-date-desc&c=EE', {
			waitUntil: 'domcontentloaded',
			timeout: 15000,
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
		if (countyList.length > 0) {
			throw new Error(`c24 couldn't click countyList going to return empty`);
		}
		await page.waitForTimeout(200); // leave it
		await clickAreas(page, "//div[@class='secondlist']/ul/li/a", parishList);
		// await clickAreas(page, "//div[@class='secondlist']/ul/li/a", cityPartList);
		await page.waitForTimeout(500); // leave it closing popup
		await page.click('a.button.navSearch');
		await page.waitForTimeout(500); // leave it closing popup
		if (parishList.length > 0) {
			throw new Error(`c24 couldn't click parishList going to return empty`);
		}
		// await (await page.$('input[name="priceRangeSearch:minValue"]')).focus();
		// await page.keyboard.type(priceMin, { delay: 25 });
		// await (await page.$('input[name="priceRangeSearch:maxValue"]')).focus();
		// await page.keyboard.type(priceMax, { delay: 25 });

		await page.click('a.searchButton');

		await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });

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
			if (url.includes('city24.ee/') && cityPart !== '') result.push({ url, id, cityPart });
		});
	} catch (error) {
		if (error.name !== 'TimeoutError') {
			console.log('🔥 ERROR 🔥');
			console.log(error);
		} else {
			console.log('15sec timeout error');
		}
		// process s.exit(1);
	} finally {
		if (page) {
      // TODO need to remove/off ?
      page.off('request', handleInterceptedRequests);
      await page.close();
    }
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

const handleInterceptedRequests = (req: puppeteer.Request) => {
  // block stylesheets fonts image/jpg and disables page caching
  if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.url().endsWith('.jpg')) {
    req.abort();
  } else {
    req.continue();
  }
}

const clickAreas = async function (page: Page, selector: string, areaList: string[]) {
	let tryCount = 20;
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
			if (tryCount < 15) {
				console.log(`⚠️ ERROR clickAreas ⚠️ ${areaList}`);
			}
			await page.waitForTimeout(1000);
		}
		await page.waitForTimeout(50);
		tryCount--;
	}
};
