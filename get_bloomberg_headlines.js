#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logging');
const WebCapture = require('./capture')
require('dotenv').config();

async function sendLatestImages(webhookUrl) {
	// Get screenshot

	const capture = new WebCapture();
	let [ticker, bloomberg] = await capture.captureBloomberg('https://www.bloomberg.com');

	if (!bloomberg || !ticker) {
		logger.error('Failed to capture bloomberg screenshot.');
		return;
	}

	await transmitDiscord(ticker, 'Bloomberg Ticker', webhookUrl);
	await transmitDiscord(bloomberg, 'Bloomberg', webhookUrl);
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

sendLatestImages(webhook_url)
.then(() => {
    logger.info('Operation completed, exiting script.');
    process.exit(0); // Exits the process successfully
})
.catch(error => {
    logger.error('An error occurred:', error);
    process.exit(1); // Exits the process with an error code
});
