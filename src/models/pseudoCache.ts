import { AdvertisementI } from '..';

export class PseudoCache {
	cache: AdvertisementI[];
	constructor() {
		this.cache = [];
	}

	needToAddToCache(newAds: AdvertisementI[]): AdvertisementI[] {
		let result: AdvertisementI[] = [];
      let foundDuplicate = false;
      for (let i = 0; i < newAds.length; i++) {
        for (let j = this.cache.length - 1; j >= 0; j--) {
          if (this.cache[j].url === newAds[i].url) {
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
}
