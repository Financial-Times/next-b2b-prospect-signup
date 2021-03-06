import MaskLogger from '@financial-times/n-mask-logger';

import Marketo from '../marketo/service';
const logger = new MaskLogger(['firstName', 'lastName', 'email']);

export default {

    requireApiKey: (req, res, next) => {

        if (!process.env.CLIENT_API_KEY) {
            throw new Error('You must set Client API keys in you environment');
        }

        if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
            return res.status(426).send('Client request must use TLS');
        }

        if (!req.headers['x-api-key'] || process.env.CLIENT_API_KEY !== req.headers['x-api-key']) {
            return res.sendStatus(403);
        } else {
            next();
        }
    },

    validateMarketoPayload: (req, res, next) => {

        const { error, value } = Marketo.validate(req.body);

        if (error) {
            logger.error('validateMarketoPayload: invalid request', error, JSON.stringify(error), error.details);

            return res.status(400).json({
                error: error.name,
                errors: error.details.map(detail => ({
                    message: detail.message,
                    property: detail.context.key
                }))
            });
        }
        res.locals.payload = value;
        next();
    }

}
