import { User, IUser } from '../models/userModel';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { NextFunction, Response, Request } from 'express';
import { sign, verify } from 'jsonwebtoken';
import crypto from 'crypto';
import { UserI } from '..';
// import { promisify } from 'util'; // gives errors
const { promisify } = require('util');

const signToken = (id: string, recover: boolean) => {
	return recover
		? sign({ id }, process.env.JWT_RECOVER_SECRET, {
				expiresIn: process.env.JWT_RECOVER_EXPIRES_IN,
		  })
		: sign({ id }, process.env.JWT_SECRET, {
				expiresIn: process.env.JWT_EXPIRES_IN,
		  });
	// return sign({ id }, process.env.JWT_SECRET, {
	// 	expiresIn: process.env.JWT_EXPIRES_IN,
	// });
};

const createSendToken = (user: IUser, statusCode: number, req: Request, res: Response) => {
	const token = signToken(user._id, false);
	res.cookie('jwt', token, {
		expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000), // days
		httpOnly: true,
		secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
	});

	// Remove password from output
	user.password = undefined;
	// user.set('password', undefined);

	res.status(statusCode).json({
		status: 'success',
		token,
		data: {
			user,
		},
	});
};

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	// const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	// console.log(`ip ? > ${req.ip}`);
	// console.log(`headers >> ${JSON.stringify(req.headers)}`);
	// console.log(`headers >> ${JSON.stringify(req.connection.remoteAddress)}`);
	// console.log(ip); // ip address of the user

	// 1) Getting token and check of it's there
	let token;
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	}

	if (!token) {
		return next(new AppError('You are not logged in! Please log in to get access.', 401));
	}

	// 2) Verification token
	const decoded = await promisify(verify)(token, process.env.JWT_SECRET);

	// 3) Check if user still exists
	const currentUser = await User.findById(decoded.id);
	if (!currentUser) {
		return next(new AppError('The user belonging to this token does no longer exist.', 401));
	}

	// 4) Check if user changed password after the token was issued
	if (currentUser.changedPasswordAfter(decoded.iat)) {
		// if (currentUser.changedPasswordAfter(decoded.iat)) {
		return next(new AppError('User recently changed password! Please log in again.', 401));
  }

	// GRANT ACCESS TO PROTECTED ROUTE
	// req.user = currentUser;
	req.body.user = currentUser;
	res.locals.user = currentUser;
	next();
});

export const signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	// console.log(req.body);
	const { email, password, passwordConfirm } = req.body;
	// const tmp: UserI = {
	// 	email: req.body.email,
	// 	password: req.body.password,
	// 	passwordConfirm: req.body.passwordConfirm,
	// };
	// 1) Check if email
	if (!email) return next(new AppError('Please provide email!', 400));
	const newUser = await new User({ email, password, passwordConfirm }).save();
	// TODO send email ? just a thank you note for signing up, no need for activation

	createSendToken(newUser, 201, req, res);
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	const { email, password } = req.body;

	// 1) Check if email and password exist
	if (!email || !password) {
		return next(new AppError('Please provide email and password!', 400));
	}
	// 2) Check if user exists && password is correct
	const user = await User.findOne({ email }).select('+password').exec();
	// ignore the error correctPassword must be async
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError('Incorrect email or password', 401));
	}

	// 3) If everything ok, send token to client
	createSendToken(user, 200, req, res);
});

export const forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	// 1) Get user based on POSTed email
	const user = await User.findOne({ email: req.body.email });
	if (!user) {
		return next(new AppError('There is no user with email address.', 404));
	}

	// 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
	await user.save({ validateBeforeSave: false });

	// 3) Send it to user's email
	try {
		// const resetURL = `${req.protocol}://${req.get(
		//   'host'
		// )}/api/v1/users/resetPassword/${resetToken}`;
		// await new Email(user, resetURL).sendPasswordReset();
		console.log(`TODO send email.. resetToken >> ${resetToken}`);
		res.status(200).json({
			status: 'success',
			message: 'Token sent to email!',
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(new AppError('There was an error sending the email. Try again later!', 500));
	}

	// -----------
	// const { email } = req.body;

	// // 1) Check if email
	// if (!email) {
	// 	return next(new AppError('Please provide email!', 400));
	// }
	// const user = await User.findOne({ email }).exec();
	// if (!user) {
	// 	return next(new AppError('Incorrect email', 401));
	// }
	// const token = signToken(user._id, true);
	// // TODO send an email with the token
	// console.log(`TODO send token > ${token}`);
	// res.status(200).json({
	// 	status: 'success',
	// });
});

export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.body.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }
    // passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

// -----------------------------------

// TODO check right object type ?
const filterObj = (obj: {}, ...allowedFields: string[]) => {
	const newObj = {};
	Object.keys(obj).forEach((el: string) => {
		// TODO imo cant use it just like in deScrapeRunnable check equality
		// @ts-ignore
		if (allowedFields.includes(el)) newObj[el] = obj[el];
	});
	return newObj;
};

export const updateMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	// 1) Create error if user POSTs password data
	if (req.body.password || req.body.passwordConfirm) {
		return next(new AppError('This route is not for password updates. Please use /updateMyPassword.', 400));
	}

	// 2) Filtered out unwanted fields names that are not allowed to be updated
	const filteredBody = filterObj(req.body, 'name', 'email');

	// 3) Update user document
	// const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
	//   new: true,
	//   runValidators: true
	// });

	const updatedUser = await User.findByIdAndUpdate(req.body.user.id, filteredBody, {
		new: true,
		runValidators: true,
	});

	res.status(200).json({
		status: 'success',
		data: {
			user: updatedUser,
		},
	});
});

export const deleteMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	await User.findByIdAndUpdate(req.body.user.id, { active: false });

	res.status(204).json({
		status: 'success',
		data: null,
	});
});

export const createUser = (req: Request, res: Response) => {
	res.status(500).json({
		status: 'error',
		message: 'This route is not defined! Please use /signup instead',
	});
};

export const getUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	let query = User.findById(req.body.user._id);
	// let query = User.findById(req.params.id);
	const doc = await query;
	if (!doc) {
		return next(new AppError('No document found with that ID', 404));
	}

	res.status(200).json({
		status: 'success',
		data: doc,
	});
});

// exports.getUser = factory.getOne(User);
// exports.getAllUsers = factory.getAll(User);

// // Do NOT update passwords with this!
// exports.updateUser = factory.updateOne(User);
// exports.deleteUser = factory.deleteOne(User);
