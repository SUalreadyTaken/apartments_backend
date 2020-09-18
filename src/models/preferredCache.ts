import { PreferredApartmentI } from './../index';

export class PreferredCache {
	cache: PreferredApartmentI[];
	constructor() {
		this.cache = [];
	}

	addToCache(preferred: PreferredApartmentI) {
		this.cache.push(preferred);
	}

	removeFormCache(email: string) {
		for (let i = 0; i < this.cache.length; i++) {
			if (this.cache[i].email === email) {
				this.cache.splice(i, 1);
				break;
			}
		}
	}
}
