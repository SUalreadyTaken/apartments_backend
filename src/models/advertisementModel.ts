import mongoose, { Schema, Document } from 'mongoose';

// TODO check the required or not '?'
export interface IAdvertisement extends Document {
	adId: string;
	site: string;
	url: string;
	imgUrl: string;
	title: string;
	cityPart: string;
	rooms: number;
	m2: number;
	floor: string;
	price: number;
	m2Price: number;
	description: string;
	date: Date;
	condition: string;
	energy: string;
	propertyOf: string;
	buildYear: number;
}

const advertisementSchema: Schema = new Schema({
	// TODO 2 sites.. ids can match
	adId: { type: String, required: true, unique: true },
	site: { type: String, required: true },
	url: { type: String, required: true, unique: true },
	imgUrl: { type: String },
	title: { type: String, required: true },
	cityPart: { type: String, required: true },
	rooms: { type: Number },
	m2: { type: Number },
	floor: { type: String },
	price: { type: Number, required: true },
	m2Price: { type: Number },
	description: { type: String },
	condition: { type: String },
	energy: { type: String },
	propertyOf: { type: String },
	buildYear: { type: Number },
	date: { type: Date, required: false, default: Date.now() },
});

// advertisementSchema.pre('save', function (this: IAdvertisement, next) {
// 	if (this.site === 'kv') {
// 		this.adId = this.adId + '_kv';
// 	} else {
// 		this.adId = this.adId + '_c24';
// 	}
// 	next();
// });

export const Advertisement = mongoose.model<IAdvertisement>('Advertisement', advertisementSchema);
