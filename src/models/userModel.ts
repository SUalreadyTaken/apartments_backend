import * as bcrypt from 'bcrypt';
import mongoose, { Schema, Document, Query } from 'mongoose';
import { randomBytes, createHash } from 'crypto';
import isEmail from 'validator/lib/isEmail';

export interface IUser extends Document {
	email: string;
	password: string;
	passwordConfirm: string;
	role: string;
	passwordChangedAt: Date;
	passwordResetToken: String;
	passwordResetExpires: Date;
  active: boolean;
  correctPassword(candidatePassword: string, userPassword: string): boolean;
  changedPasswordAfter(this: IUser, JWTTimestamp: number): boolean;
  createPasswordResetToken(this: IUser): string;
}

const userSchema: Schema = new Schema({
	email: {
		type: String,
		required: [true, 'Please provide your email'],
		unique: true,
		lowercase: true,
		validate: [isEmail, 'Please provide a valid email'],
	},
	role: {
		type: String,
		enum: ['user', 'admin'],
		default: 'user',
	},
	password: {
		type: String,
		required: [true, 'Please provide a password'],
		minlength: 8,
		select: false,
	},
	passwordConfirm: {
		type: String,
		required: [true, 'Please confirm your password'],
		validate: {
			// This only works on CREATE and SAVE!!!
			validator: function (el: string) {
				return el === this.password;
			},
			message: 'Passwords are not the same!',
		},
	},
	passwordChangedAt: Date,
	passwordResetToken: String,
	passwordResetExpires: Date,
	active: {
		type: Boolean,
		default: true,
		select: false,
	},
});

userSchema.pre('save', async function (this: IUser, next) {
	// Only run this function if password was actually modified
	if (!this.isModified('password')) return next();

	// Hash the password with cost of 12
	this.password = await bcrypt.hash(this.password, 12);

	// Delete passwordConfirm field
	this.passwordConfirm = undefined;
	next();
});

userSchema.pre('save', function (this: IUser, next) {
	if (!this.isModified('password') || this.isNew) return next();

	this.passwordChangedAt = new Date(Date.now() - 1000);
	next();
});

// TODO check if correct query type
userSchema.pre(/^find/, function (this: Query<Document>, next) {
	// this points to the current query
	this.find({ active: { $ne: false } });
	// this.find({ active: { $ne: false } });
	next();
});

userSchema.methods.correctPassword = async function (candidatePassword: string, userPassword: string) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (this: IUser, JWTTimestamp: number) {
	if (this.passwordChangedAt) {
		const changedTimestamp = Math.ceil(this.passwordChangedAt.getTime() / 1000);
		// const changedTimestamp = parseInt(
		//   this.passwordChangedAt.getTime() / 1000,
		//   10
		// );

		return JWTTimestamp < changedTimestamp;
	}

	// False means NOT changed
	return false;
};

userSchema.methods.createPasswordResetToken = function (this: IUser) {
	const resetToken = randomBytes(32).toString('hex');

	this.passwordResetToken = createHash('sha256').update(resetToken).digest('hex');

	// console.log({ resetToken }, this.passwordResetToken);

	// this.passwordResetExpires = new Date(Date.now() + 1 * 1000);
	this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

	return resetToken;
};

export const User = mongoose.model<IUser>('User', userSchema);
