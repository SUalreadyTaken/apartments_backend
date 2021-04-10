import { IAdvertisement } from './models/advertisementModel';
import { IPreferredApartment } from './models/preferredApartmentModel'
import { IUser } from './models/userModel';

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

export interface PreferredApartmentI {
  userId: IPreferredApartment['userId'];
	email: IPreferredApartment['email'];
	cityPart?: IPreferredApartment['cityPart'];
	priceMin?: IPreferredApartment['priceMin'];
	priceMax?: IPreferredApartment['priceMax'];
	m2Min?: IPreferredApartment['m2Min'];
	m2Max?: IPreferredApartment['m2Max'];
	roomsMin?: IPreferredApartment['roomsMin'];
	roomsMax?: IPreferredApartment['roomsMax'];
	m2PriceMin?: IPreferredApartment['m2PriceMin'];
	m2PriceMax?: IPreferredApartment['m2PriceMax'];
	date: IPreferredApartment['date'];
}

export interface UserI {
	email: IUser['email'];
	password: IUser['password'];
	passwordConfirm: IUser['passwordConfirm'];
	role?: IUser['role'];
	passwordChangedAt?: IUser['passwordChangedAt'];
	passwordResetToken?: IUser['passwordResetToken'];
	passwordResetExpires?: IUser['passwordResetExpires'];
	active?: IUser['active'];
	// password: string;
	// passwordConfirm: string;
	// role: string;
	// passwordChangedAt: Date;
	// passwordResetToken: String;
	// passwordResetExpires: Date;
	// active: boolean;
}