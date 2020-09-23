import { DocumentQuery, Document } from 'mongoose';

export class APIFeatures {
	queryString: qs.ParsedQs;
	query: DocumentQuery<Document[], Document, {}>;
	constructor(query: DocumentQuery<Document[], Document, {}>, queryString: qs.ParsedQs) {
		this.query = query;
		this.queryString = queryString;
	}

	filter() {
		const queryObj = { ...this.queryString };
		const excludedFields = ['page', 'sort', 'limit', 'fields'];
		excludedFields.forEach((el) => delete queryObj[el]);
		// moved to controller
		// if (typeof queryObj.cityPart === 'string') {
		//   const tmpCityPart = queryObj.cityPart.split(',');
		//   if (tmpCityPart.length > 1) queryObj.cityPart = {$in: tmpCityPart};
		// }
		let queryStr = JSON.stringify(queryObj);
		queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

		this.query = this.query.find(JSON.parse(queryStr));

		return this;
	}

	sort() {
		if (typeof this.queryString.sort === 'string') {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('-date');
		}

		return this;
	}

	limitFields() {
		if (typeof this.queryString.fields === 'string') {
			const fields = this.queryString.fields.split(',').join(' ');
			this.query = this.query.select(fields);
		} else {
      // FIXME ? do i need adId and _id ? 
      // this.query = this.query.select('-__v');
      this.query = this.query.select('-__v -_id -adId');
		}

		return this;
	}

	paginate() {
		let page = 1;
		let limit = 50;
		if (typeof this.queryString.page === 'string') {
			const tmpPage = parseInt(this.queryString.page);
			if (!isNaN(tmpPage)) page = tmpPage;
		}
		if (typeof this.queryString.limit === 'string') {
			const tmpLimit = parseInt(this.queryString.limit);
			if (!isNaN(tmpLimit)) limit = tmpLimit;
		}

		const skip = (page - 1) * limit;
		this.query = this.query.skip(skip).limit(limit);

		return this;
	}
}
