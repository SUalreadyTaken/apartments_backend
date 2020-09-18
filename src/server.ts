import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from './app';
import { populatePreferredCache } from './email/searchPreferred';
import { populatePseudoCache } from './scrape/deScrapeRunnable';

dotenv.config({ path: `${__dirname}/../config.env` });

const DB = process.env.DATABASE;

mongoose
.connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
})
// .then(() => console.log('DB connection successful!'));
.then(async () => {
  console.log('DB connection successful!');
  await populatePreferredCache();
  await populatePseudoCache();
  // await dropAllCollections();
});

async function dropAllCollections() {
	const collections = await mongoose.connection.db.collections();
	console.log(`🔥going to drop all collections `);
	for (const collection of collections) {
    // console.log(collection.namespace);
		await mongoose.connection.db.dropCollection(collection.namespace.split('.')[1]);
	}
	console.log(`🔥deleted🔥`);
}

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
	console.log(`App running on port ${port}...`);
});
