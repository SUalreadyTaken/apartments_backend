import { AppError } from '../utils/appError';
import { NextFunction, Response, Request } from 'express';

// TODO need to make an Error interface for ts to be happy
// @ts-ignore
const handleCastErrorDB = (err) => {
	const message = `Invalid ${err.path}: ${err.value}.`;
	return new AppError(message, 400);
};

// TODO need to make an Error interface for ts to be happy
// @ts-ignore
const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];

	const message = `${value} already in use. Please use another`;
	return new AppError(message, 400);
};

// TODO need to make an Error interface for ts to be happy
// @ts-ignore
const handleValidationErrorDB = (err) => {
	// @ts-ignore
  const errors = Object.values(err.errors).map((el) => el.message);
  console.log('this should have gotten hit and it did');

	const message = `Invalid input data. ${errors.join('. ')}`;
	return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

// TODO need to make an Error interface for ts to be happy
// @ts-ignore
const sendErrorDev = (err, req: Request, res: Response) => {
  // A) API
	if (req.originalUrl.startsWith('/api')) {
		return res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack,
		});
	}

	// B) RENDERED WEBSITE
	console.error('ERROR 💥', err);
	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong!',
		msg: err.message,
	});
};
// TODO need to make an Error interface for ts to be happy
// @ts-ignore
const sendErrorProd = (err, req: Request, res: Response) => {
	if (req.originalUrl.startsWith('/api')) {
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message,
			});
		}
  }
  // Programming or other unknown error: don't leak error details
		// 1) Log error
		console.error('ERROR 💥', err);
		// 2) Send generic message
		return res.status(500).json({
			status: 'error',
			message: 'Something went very wrong!',
		});

  // Dont need it DELETE
	// // B) RENDERED WEBSITE
	// // A) Operational, trusted error: send message to client
	// if (err.isOperational) {
	// 	return res.status(err.statusCode).render('error', {
	// 		title: 'Something went wrong!',
	// 		msg: err.message,
	// 	});
	// }
	// // B) Programming or other unknown error: don't leak error details
	// // 1) Log error
	// console.error('ERROR 💥', err);
	// // 2) Send generic message
	// return res.status(err.statusCode).render('error', {
	// 	title: 'Something went wrong!',
	// 	msg: 'Please try again later.',
	// });
};

// TODO need to make an Error interface for ts to be happy
// @ts-ignore
export const globalErrorHandler = (err, req: Request, res: Response, next: NextFunction) => {
// module.exports = (err, req: Request, res: Response, next: NextFunction) => {
	// module.exports = (err, req, res, next) => {
	// console.log(err.stack);
	err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  //delete after
  console.log(`globalErrorHandler() .. err >> ${err}`);
  console.log(`globalErrorHandler() err.name >> ${err.name}`);

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		let error = { ...err };
    error.message = err.message;
    console.log(`undefined ?? ${JSON.stringify(error)}`);
    console.log(`statement is >> '${error.name === 'ValidationError'}' .. name >> '${error.name}'`);
		if (error.name === 'CastError') error = handleCastErrorDB(error);
		if (error.code === 11000) error = handleDuplicateFieldsDB(error);
		if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
		if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    

		sendErrorProd(error, req, res);
	}
};
