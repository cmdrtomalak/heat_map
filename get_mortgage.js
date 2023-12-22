#!/usr/bin/env node
const WebCapture = require('./capture');
const logger = require('./logging');
const transmitDiscord = require('./get_sp_heat_map');
require('dotenv').config();

async function sendLatestImages(mortgageUrl, webhookUrl) {
	const capture = new WebCapture();

	let mortgage = await capture.capture('https://www.wellsfargo.com/mortgage/rates/', 'contentBody')

	if (!mortgage) {
		logger.error('Failed to capture Mortgage screenshot.');
		return;
	}

	await transmitDiscord(mortgage, 'Mortgage', webhookUrl);
}

webhook_url = process.env.WEBHOOK_URL;
logger.info('Webhook: ' + process.env.WEBHOOK_URL);

let mortgageUrl = 'https://www.wellsfargo.com/mortgage/rates/'
sendLatestImages(mortgageUrl, webhook_url)
.then(() => {
    logger.info('Operation completed, exiting script.');
    process.exit(0); // Exits the process successfully
})
.catch(error => {
    logger.error('An error occurred:', error);
    process.exit(1); // Exits the process with an error code
});