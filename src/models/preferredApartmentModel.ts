import mongoose, { Schema, Document } from 'mongoose';
const validator = require('validator');

export interface IPreferredApartment extends Document {
	userId: string;
	email: string;
	cityPart: Array<string>;
	priceMin: number;
	priceMax: number;
	m2Min: number;
	m2Max: number;
	roomsMin: number;
	roomsMax: number;
	m2PriceMin: number;
	m2PriceMax: number;
	date: Date;
}

const preferredApartmentSchema: Schema = new Schema({
	userId: { type: String, required: true, unique: true },
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		validate: [validator.isEmail, 'Please provide a valid email'],
	},
	cityPart: { type: Array, required: true },
	priceMin: { type: Number },
	priceMax: { type: Number },
	m2Min: { type: Number },
	m2Max: { type: Number },
	roomsMin: { type: Number },
	roomsMax: { type: Number },
	m2PriceMin: { type: Number },
	m2PriceMax: { type: Number },
	date: { type: Date, required: false, default: Date.now() },
});

export const PreferredApartment = mongoose.model<IPreferredApartment>('PreferredApartment', preferredApartmentSchema);
