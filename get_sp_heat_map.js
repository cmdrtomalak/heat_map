#!/usr/bin/env node
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
require('dotenv').config();

// Configure Winston Logger for Weekly Rotation
const logger = createLogger({
	format: format.combine(
		format.timestamp(),
		format.json()
	),
	transports: [
		new transports.DailyRotateFile({
			filename: 'logs/heat-map-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			frequency: 'weekly',
			zippedArchive: true,
			maxSize: '20m',
			maxFiles: '4'
		})
	]
});

async function captureHeatMap(url) {
	let options = new chrome.Options();
	options.addArguments('--headless');
	options.addArguments('--disable-gpu');
	options.addArguments('user-agent=Chrome/88.0.4324.150');
	options.windowSize({ width: 1920, height: 1280 });

	driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();

	try {
		await driver.get(url);

		await driver.executeScript("window.scrollBy(0, 150)");

		let canvasElement = await driver.wait(until.elementLocated(By.css('.chart')), 500);

		let screenshot = await canvasElement.takeScreenshot();

		return screenshot;
	}
	finally {
		await driver.quit();
	}
}

async function sendLatestImage(chart_url, webhookUrl) {
	// Get screenshot
	let screenshotBase64 = await captureHeatMap(chart_url);

	if (!screenshotBase64) {
		logger.error('Failed to capture screenshot.');
		return;
	}

	// Prepare the payload
	const screenshotBuffer = Buffer.from(screenshotBase64, 'base64')
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
		logger.info('File sent successfully:', response.statusText);
	} catch (error) {
		logger.error('Error sending file:', error.message);
	}
}

webhook_url = process.env.WEBHOOK_URL;

sendLatestImage('https://finviz.com/map.ashx?t=sec', webhook_url)
.then(() => {
    logger.info('Operation completed, exiting script.');
    process.exit(0); // Exits the process successfully
})
.catch(error => {
    logger.error('An error occurred:', error);
    process.exit(1); // Exits the process with an error code
});
