// import { AdvertisementI } from '..';
import { initScrapeDataI } from './../scrape/index';
import { AdvertisementI } from './../index';

export class PseudoCache {
	cache: initScrapeDataI[];
	// cache: initScrapeDataI[];
	constructor() {
		this.cache = [];
	}

	needToAddToCache(newAds: AdvertisementI[]): AdvertisementI[] {
		let result: AdvertisementI[] = [];
		let foundDuplicate = false;
		for (let i = 0; i < newAds.length; i++) {
			for (let j = this.cache.length - 1; j >= 0; j--) {
				if (this.cache[j].id === newAds[i].adId) {
					foundDuplicate = true;
					break;
				}
			}
			if (!foundDuplicate) {
				result.push(newAds[i]);
			} else {
				break;
			}
		}
		for (let i = 0; i < result.length; i++) {
			this.cache.push({
				id: result[i].adId,
				url: result[i].url,
				cityPart: result[i].cityPart,
			});
			// this.cache.push(result[i]);
		}
		return result;
	}

	inCache(newAds: initScrapeDataI[]): initScrapeDataI[] {
		let result: initScrapeDataI[] = [];
		let foundDuplicate = false;
		for (let i = 0; i < newAds.length; i++) {
			for (let j = this.cache.length - 1; j >= 0; j--) {
				if (this.cache[j].id === newAds[i].id) {
					foundDuplicate = true;
					break;
				}
			}
			if (!foundDuplicate) {
				result.push(newAds[i]);
			} else {
				break;
			}
		}
		for (let i = 0; i < result.length; i++) {
			this.cache.push(result[i]);
		}
		return result;
	}

	removeFromCache(targetId: string) {
		for (let i = 0; i < this.cache.length; i++) {
			if (this.cache[i].id === targetId) {
				this.cache.splice(i, 1);
				break;
			}
		}
	}
}
