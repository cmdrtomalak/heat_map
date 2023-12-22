#!/usr/bin/env node
const WebCapture = require('./capture');
const logger = require('./logging');
const transmitDiscord = require('./get_sp_heat_map');
require('dotenv').config();

async function sendLatestImages(yieldurl, webhookUrl) {
	const capture = new WebCapture();
	
	let yield_chart = await capture.capture(yieldurl, 'main-3-FullScreenChartIQ-Proxy', sleep=300, width=1024, height=768);

	if (!yield_chart) {
		logger.error('Failed to capture 10Y Yield screenshot.');
		return;
	}

	await transmitDiscord(yield_chart, '10 Year Yield', webhookUrl);
}

webhook_url = process.env.WEBHOOK_URL;
logger.info('Webhook: ' + process.env.WEBHOOK_URL);

let YFinance10YrYieldUrl = 'https://finance.yahoo.com/chart/%5ETNX';
sendLatestImages(YFinance10YrYieldUrl, webhook_url)
.then(() => {
    logger.info('Operation completed, exiting script.');
    process.exit(0); // Exits the process successfully
})
.catch(error => {
    logger.error('An error occurred:', error);
    process.exit(1); // Exits the process with an error code
});