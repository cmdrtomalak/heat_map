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

class WebCapture {
	constructor() {
		this.driver = null;
		this.canvasElement = null;
		this.screenshot = null;
	}

	async initDriver(width, height) {
		let options = new chrome.Options();
		options.addArguments('--headless');
		options.addArguments('--disable-gpu');
		options.addArguments('user-agent=Chrome/88.0.4324.150');
		options.windowSize({ width, height });

		this.driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
	}

	async capture(url, element, selector='id', sleep=0, wait=0, scroll=0, width=1280, height=1080) {
		await this.initDriver(width, height);
		try {
			await this.driver.get(url);

			if (sleep > 0) {
				await this.driver.sleep(sleep);
			}

			if (scroll > 0) {
				await this.driver.executeScript(`window.scrollBy(0, ${scroll})`);
			}

			if (wait > 0 && selector == 'css') {
				// let canvasElement = await this.driver.wait(until.elementLocated(By.css('.chart')), 500);
				this.canvasElement = await this.driver.wait(until.elementLocated(By.css(element)), wait);
			} else if (selector == 'css') {
				this.canvasElement = await this.driver.findElement(By.css(element));
			} else {
				this.canvasElement = await this.driver.findElement(By.id(element));
			}

			if (this.canvasElement) {
				this.screenshot = await this.canvasElement.takeScreenshot();
			}

			return this.screenshot;
		} catch (err) {
			logger.error('Error during capture: ', err);
		} finally {
			await this.driver.quit();
		}
	}

	// async captureBloomberg(url) {
	// 	await this.initDriver(1024, 768);

	// 	try {
	// 		await this.driver.get(url);

	// 		let canvasElement = await this.driver.findElement(By.id('div[data-component="ticker-bar"]'));
	// 		console.log("Hello, There");

	// 		let screenshot = await canvasElement.takeScreenshot();

	// 		return screenshot;
	// 	} catch(err) {
	// 		logger.error('Error during capture: ', err);
	// 	} finally {
	// 		await this.driver.quit();
	// 	}
	// }

}

async function sendLatestImages(sp_500_chart_url, yieldurl, mortgageUrl, webhookUrl) {
	// Get screenshot
	const capture1 = new WebCapture();

	// let screenshotBase64 = await capture1.captureSnpHeatMap(sp_500_chart_url);
	let screenshotBase64 = await capture1.capture(sp_500_chart_url, '.chart', 'css', wait=500, scroll=150);

	if (!screenshotBase64) {
		logger.error('Failed to capture S&P 500 screenshot.');
		return;
	}

	await transmitDiscord(screenshotBase64, 'S&P 500', webhookUrl);

	const capture2 = new WebCapture();
	// let yield_chart = await capture2.captureYield(yieldurl);
	
	let yield_chart = await capture2.capture(yieldurl, 'main-3-FullScreenChartIQ-Proxy', sleep=300, width=1024, height=768);

	if (!yield_chart) {
		logger.error('Failed to capture 10Y Yield screenshot.');
		return;
	}

	await transmitDiscord(yield_chart, '10 Year Yield', webhookUrl);

	const capture3 = new WebCapture();

	let mortgage = await capture3.capture('https://www.wellsfargo.com/mortgage/rates/', 'contentBody')

	if (!mortgage) {
		logger.error('Failed to capture Mortgage screenshot.');
		return;
	}

	await transmitDiscord(mortgage, 'Mortgage', webhookUrl);

	// const capture4 = new WebCapture();
	// let bloomberg = await capture4.captureBloomberg('https://www.bloomberg.com');

	// if (!bloomberg) {
	// 	logger.error('Failed to capture bloomberg screenshot.');
	// 	return;
	// }

	// await transmitDiscord(bloomberg, 'Bloomberg', webhookUrl);
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
let YFinance10YrYieldUrl = 'https://finance.yahoo.com/chart/%5ETNX';
let mortgageUrl = 'https://www.wellsfargo.com/mortgage/rates/'
// let _ = capture10YrYield(mortgageUrl);
sendLatestImages(spUrl, YFinance10YrYieldUrl, mortgageUrl, webhook_url)
.then(() => {
    logger.info('Operation completed, exiting script.');
    process.exit(0); // Exits the process successfully
})
.catch(error => {
    logger.error('An error occurred:', error);
    process.exit(1); // Exits the process with an error code
});

