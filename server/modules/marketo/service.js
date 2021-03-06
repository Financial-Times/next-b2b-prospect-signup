import Marketo from 'node-marketo-rest';
import Joi from 'joi';
import * as constants from './constants';

const endpoint = process.env.MARKETO_REST_ENDPOINT;
const identity = process.env.MARKETO_IDENTITY_ENDPOINT;
const clientId = process.env.MARKETO_CLIENT_ID;
const clientSecret = process.env.MARKETO_CLIENT_SECRET;

if (!endpoint || !identity || !clientId || !clientSecret){
	throw new Error('You must set Marketo API keys in you environment');
}
const marketo = new Marketo({ endpoint, identity, clientId, clientSecret });

const parseResult = ({ result = [] } = {}) => {

	if (result.length <= 0) {
		const error = new Error('No results returned');
		error.type = constants.NOT_FOUND_ERROR;
		throw error;
	} else if (result.length > 1) {
		const error = new Error('Unexpected result returned - multiple results');
		error.type = constants.UNEXPECTED_RESULT_ERROR;
		throw error;
	}

	const res = result[0];

	if (res.status === 'skipped') {
		const error = new Error('Lead already exists');
		error.type = constants.LEAD_ALREADY_EXISTS_ERROR;
		error.reason = res.reasons;
		throw error;
	}

	if (res.status === 'timeout') {
		const error = new Error('Marketo timeout');
		error.type = constants.API_TIMEOUT_ERROR;
		error.reason = res.reasons;
		throw error;
	}

	if (res.status !== 'created' && res.status !== 'updated') {
		const error = new Error('Marketo errored');
		error.type = constants.UNEXPECTED_RESULT_ERROR;
		error.reason = res.reasons;
		throw error;
	}

	return res;
}

export default {

	validate: (payload) => {
		return Joi.validate(payload, constants.SCHEMA, { abortEarly: false });
	},

	createOrUpdate: (payload) => {
		const eightSecondTimeout = new Promise(resolve => setTimeout(resolve, 8000, { result: [{ status: 'timeout' }] }));
		return Promise.race([
			eightSecondTimeout,
			marketo.lead.createOrUpdate([ payload ], { lookupField: 'email' })
		]).then(parseResult);
	}


};
