import { app } from './../app';
import { AdvertisementI, PreferredApartmentI } from './../index';
import { PreferredCache } from './../models/preferredCache';
import { EventEmitter } from 'events';
import { PreferredApartment } from '../models/preferredApartmentModel';

const preferredCache = new PreferredCache();
const apartmentEmitter: EventEmitter = app.get('apartmentEmitter');

export const populatePreferredCache = async () => {
	console.log('Populating PreferredCache');
	const preferredApartmentsDB = await PreferredApartment.find({}).exec();
	for (const data of preferredApartmentsDB) {
		preferredCache.addToCache(data);
	}
};

apartmentEmitter.on('newApartment', (data: AdvertisementI) => prepareEmail(data));

const prepareEmail = (advertisement: AdvertisementI) => {
	for (let i = 0; i < preferredCache.cache.length; i++) {
		const preferredApartment = preferredCache.cache[i];
		if (isPreferred(advertisement, preferredApartment)) {
			console.log(`✉️  Send email 
      New apartment ${advertisement.url}
      cityPart: ${advertisement.cityPart}
      price: ${advertisement.price}
      m2: ${advertisement.m2}
      m2Price: ${advertisement.m2Price}
      rooms: ${advertisement.rooms}`);
			// console.log(emailContent(advertisement));
		}
	}
};

const isPreferred = (advertisement: AdvertisementI, preferredApartment: PreferredApartmentI): boolean => {
	if (preferredApartment.cityPart && !preferredApartment.cityPart.includes(advertisement.cityPart)) return false;
	if (preferredApartment.priceMin && preferredApartment.priceMin > advertisement.price) return false;
	if (preferredApartment.priceMax && preferredApartment.priceMax < advertisement.price) return false;
	if (preferredApartment.m2Min && preferredApartment.m2Min > advertisement.m2) return false;
	if (preferredApartment.m2Max && preferredApartment.m2Max < advertisement.m2) return false;
	if (preferredApartment.m2PriceMin && preferredApartment.m2PriceMin > advertisement.m2Price) return false;
	if (preferredApartment.m2PriceMax && preferredApartment.m2PriceMax < advertisement.m2Price) return false;
	if (preferredApartment.roomsMin && preferredApartment.roomsMin > advertisement.rooms) return false;
	if (preferredApartment.roomsMax && preferredApartment.roomsMax < advertisement.rooms) return false;
	return true;
};

const emailContent = (advertisement: AdvertisementI): string => {
	return `New apartment ${advertisement.title}
  ${advertisement.url}`;
};
