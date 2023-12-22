#!/usr/bin/env node
const WebCapture = require('./capture');
// const fs = require('fs');
// const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logging');
require('dotenv').config();

async function sendLatestImages(sp_500_chart_url, webhookUrl) {
	// Get screenshot
	const capture1 = new WebCapture();

	// let screenshotBase64 = await capture1.captureSnpHeatMap(sp_500_chart_url);
	let screenshotBase64 = await capture1.capture(sp_500_chart_url, '.chart', 'css', wait=500, scroll=150);

	if (!screenshotBase64) {
		logger.error('Failed to capture S&P 500 screenshot.');
		return;
	}

	await transmitDiscord(screenshotBase64, 'S&P 500', webhookUrl);
}

async function transmitDiscord(payload, subject, webhookUrl) {
	const screenshotBuffer = Buffer.from(payload, 'base64')
	logger.info(`${subject} Screenshot buffer is ` + screenshotBuffer.length + ' long.')
	if (screenshotBuffer.length < 100) {
		logger.error('Screenshot buffer is too small, likely invalid.');
		return;
	}

	const formData = new FormData();
	formData.append('file', screenshotBuffer, { filename: 'screenshot.png' });

	try {
		const response = await axios.post(webhookUrl, formData, {
			headers: formData.getHeaders()
		});
		logger.info(`${subject} File sent successfully:`, response.statusText);
	} catch (error) {
		logger.error(`Error sending ${subject} file:`, error.message);
	}
}

webhook_url = process.env.WEBHOOK_URL;
logger.info('Webhook: ' + process.env.WEBHOOK_URL);


let spUrl = 'https://finviz.com/map.ashx?t=sec';
// let YFinance10YrYieldUrl = 'https://finance.yahoo.com/chart/%5ETNX';
// let mortgageUrl = 'https://www.wellsfargo.com/mortgage/rates/'
// let _ = capture10YrYield(mortgageUrl);
sendLatestImages(spUrl, webhook_url)
.then(() => {
    logger.info('Operation completed, exiting script.');
    process.exit(0); // Exits the process successfully
})
.catch(error => {
    logger.error('An error occurred:', error);
    process.exit(1); // Exits the process with an error code
});

module.exports = transmitDiscord;