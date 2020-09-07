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
	floor?: IAdvertisement['floor'];
	price: IAdvertisement['price'];
	m2price: IAdvertisement['m2price'];
	description: IAdvertisement['description'];
	date?: IAdvertisement['date'];
}
