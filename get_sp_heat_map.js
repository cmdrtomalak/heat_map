#!/usr/bin/env node
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

async function captureHeatMap(url) {
	let options = new chrome.Options();
	options.addArguments('--headless');
	options.addArguments('--disable-gpu');
	options.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36');
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

	// Prepare the payload
	const screenshotBuffer = Buffer.from(screenshotBase64, 'base64')
	const formData = new FormData();
	formData.append('file', screenshotBuffer, { filename: 'screenshot.png' });

	try {
		const response = await axios.post(webhookUrl, formData, {
			headers: formData.getHeaders()
		});
		console.log('File sent successfully:', response.statusText);
	} catch (error) {
		console.error('Error sending file:', error.message);
	}
}

webhook_url = process.env.WEBHOOK_URL;

sendLatestImage('https://finviz.com/map.ashx?t=sec', webhook_url)
.then(() => {
    console.log('Operation completed, exiting script.');
    process.exit(0); // Exits the process successfully
})
.catch(error => {
    console.error('An error occurred:', error);
    process.exit(1); // Exits the process with an error code
});
