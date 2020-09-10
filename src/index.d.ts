import { IAdvertisement } from './models/advertisementModel';

// TODO change the name
export interface AdvertisementI {
	adId: IAdvertisement['adId'];
	site: IAdvertisement['site'];
	url: IAdvertisement['url'];
	imgUrl: IAdvertisement['imgUrl'];
	title: IAdvertisement['title'];
	cityPart: IAdvertisement['cityPart'];
	rooms: IAdvertisement['rooms'];
	m2: IAdvertisement['m2'];
	floor: IAdvertisement['floor'];
	price: IAdvertisement['price'];
	m2Price: IAdvertisement['m2Price'];
	description: IAdvertisement['description'];
	date: IAdvertisement['date'];
	energy: IAdvertisement['energy'];
	condition: IAdvertisement['condition'];
	propertyOf: IAdvertisement['propertyOf'];
	buildYear: IAdvertisement['buildYear'];
}

// TODO delete
// export interface DeAdvertisementI {
// 	adId: string;
// 	site: string;
// 	url: string;
// 	imgUrl: string;
// 	title: string;
// 	cityPart: string;
// 	rooms: string;
// 	m2: string;
// 	floor?: string;
// 	price: string;
// 	m2price: number;
// 	description: string;
// 	date?: string;
// }