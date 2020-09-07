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
	floor?: string;
	price: number;
	m2price: number;
	description: string;
	date?: Date;
}

const advertisementSchema: Schema = new Schema({
	// TODO 2 sites.. ids can match
	adId: { type: String, required: true, unique: true },
	site: { type: String, required: true },
	url: { type: String, required: true, unique: true },
	imgUrl: { type: String, required: true, unique: true },
	title: { type: String, required: true },
	cityPart: { type: String, required: true },
	rooms: { type: Number },
	m2: { type: Number },
	floor: { type: String },
	price: { type: Number, required: true },
	m2price: { type: Number },
	description: { type: String },
	date: { type: Date, required: false, default: new Date() },
});

advertisementSchema.pre('save', function(this: IAdvertisement, next) {
  if (this.site === 'kv') {
    this.adId = this.adId + '_kv'
  } else {
    this.adId = this.adId + '_c24'
  }
  next();
});

export const Advertisement = mongoose.model<IAdvertisement>('Advertisement', advertisementSchema);
