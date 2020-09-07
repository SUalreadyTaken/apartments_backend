import puppeteer, { Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { c24CityPartsSet } from '../utils/searchVariables';
import { AdvertisementI } from '..';
import { devLog } from './../utils/devLogger';

export async function c24Scrape(countyList: string[], parishList: string[]) {
	let result: AdvertisementI[] = [];
  let browser;
	try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
		devLog('🕵️‍♂️ Crawling C24 data...');
		let page = await browser.newPage();
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
		await page.waitFor(200); // leave it
		await clickAreas(page, "//div[@class='secondlist']/ul/li/a", parishList);
		// await clickAreas(page, "//div[@class='secondlist']/ul/li/a", cityPartList);
		await page.waitFor(500); // leave it closing popup
		await page.click('a.button.navSearch');
		await page.waitFor(500); // leave it closing popup
		if (countyList.length != 0 || parishList.length != 0) {
			console.log(`something went wrong arrays need to be empty
      countyList > ${countyList} | parishList > ${parishList}`);
			return result;
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
			const id = combined.attr('name');
			const adUrl = combined.attr('href').split('?sel', 1)[0];
			const title = combined.find('span').text();
			const imgUrl = $(this).find('a.highslide').attr('data-thumb-url')?.slice(2) || '';
			const tmpCityPartsList = combined
				.find('span')
				.text()
				.split(',')
				.map((e) => e.trim());
			let cityPart = '';
			for (const cp of tmpCityPartsList) {
				if (c24CityPartsSet.has(cp)) {
					cityPart = cp;
					break;
				}
			}

			const resultContent = $(this).find('div.result_content > div.column > ol > li');
			let m2 = '';
			let rooms = '';
			let floor = '';
			resultContent.each(function (this: CheerioElement) {
				const tmp = $(this).find('strong').text();
				const isSpan = $(this).find('span');
				if (isSpan.length > 0) {
					if (isSpan.text().includes('Tubade')) {
						rooms = tmp;
					} else if (isSpan.text().includes('Korrusel')) {
						floor = tmp;
					}
				} else {
					m2 = tmp.indexOf(' ') > -1 ? tmp.slice(0, tmp.indexOf(' ')) : tmp;
				}
			});
			const added = $(this).find('div.item_added_time > span').text();
			const priceTmp = $(this).find('div.price > div').text();
			let price = priceTmp.indexOf('/') > -1 ? priceTmp.split('/')[1].trim() : priceTmp;
			price = price.replace(' ', '');
			let m2Price = $(this).find('div.price_sqrm').text();
			if (m2Price.length > 0) {
				m2Price = m2Price.split(' ')[0].replace(',', '.');
				if (m2.length === 0) {
					devLog(`findme`);
					m2 = String(parseFloat(price) / parseFloat(m2Price));
					if (m2.indexOf('.') > -1) {
						m2 = m2.slice(0, m2.indexOf('.') + 2);
					}
				}
			} else {
				if (price.length > 0 && m2.length > 0) {
					m2Price = String(parseFloat(price) / parseFloat(m2));
					if (m2Price.indexOf('.') > -1) {
						m2Price = m2Price.slice(0, m2Price.indexOf('.') + 3);
					}
				}
			}
			const description = $(this).find('div.promo > span').text().trim();
			if (cityPart.length === 0 || !adUrl.includes('city24.ee')) {
				devLog(`cityParts zero or url wrong >> url ${adUrl} || tmpCityParts > ${tmpCityPartsList}`);
			} else {
				// devLog(
				// 	`url ${adUrl}\nid: ${id}\nimgUrl: ${imgUrl}\ntitle: ${title}\ncity-part: ${cityPart}\nrooms: ${rooms}\nsurface: ${surface}\nfloor: ${floor}\nadded: ${added}\nprice: ${price}\nm2: ${pricePerM2}\ndescription: ${description}`
				// );
				// devLog(`-------------`);
				result.push({
					adId: id,
					site: 'c24',
					url: adUrl,
					imgUrl: imgUrl,
					title: title,
					cityPart: cityPart,
					rooms: parseInt(rooms) | 0,
					m2: parseFloat(m2) | 0,
					price: parseFloat(price) | 0,
					m2price: parseFloat(m2Price) | 0,
					floor: floor,
					description: description,
				});
			}
		});
		// devLog(`table len > ${advertisementTable.length}`);
		// await page.waitFor(2000);
	} catch (error) {
    console.log('🔥 ERROR 🔥');
		console.log(error);
		// proces s.exit(1);
	}
  if (browser) await browser.close();
	return result;
}

const waitAndLog = async (page: Page, selector: string, timeout = 30000) => {
	const start = Date.now();
	let myElement = await page.$(selector);
	while (!myElement) {
		await page.waitFor(250);
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
					await page.waitFor(50);
					areaList.splice(areaList.indexOf(text), 1);
					if (areaList.length === 0) return;
				}
			}
		} catch (error) {
			console.log(`⚠️ ERROR clickAreas (usually will see 1) ⚠️ ${areaList}`);
			await page.waitFor(1000);
		}
		await page.waitFor(50);
		tryCount--;
	}
};
