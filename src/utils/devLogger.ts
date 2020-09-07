// duplicate.. needed for test
import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../config.env` });

export const devLog = (s: string): void => {
	if (process.env.NODE_ENV === 'development') {
		console.log(s);
	}
};
