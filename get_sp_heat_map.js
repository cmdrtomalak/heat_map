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

	driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

	try {
		await driver.get('https://finviz.com/map.ashx');

		await driver.executeScript("window.scrollBy(0, 150)");

		// let canvasElement = await driver.findElement(By.css('.chart'));
		let canvasElement = await driver.wait(until.elementLocated(By.css('.chart')), 500);

		let screenshot = await canvasElement.takeScreenshot();

		// Save the screenshot to a file
		const now = new Date();
		const timestamp = now.toISOString().replace(/:/g, '-').replace('T', '-').split('.')[0];

		fs.writeFileSync(`images/SP_500_heatmap_${timestamp}.png`, screenshot, 'base64');
	}
	finally {
		await driver.quit();
	}
}

async function sendLatestImage(chart_url, webhookUrl) {
	await captureHeatMap(chart_url);

  const imagesDir = path.join(__dirname, 'images');

  // Check if the 'images' directory exists
  if (!fs.existsSync(imagesDir)) {
      console.error('Images directory does not exist.');
      return;
  }

  // Read the 'images' directory
  const files = fs.readdirSync(imagesDir).filter(file => file.endsWith('.png'));

  // Sort files by creation time
  const sortedFiles = files.map(filename => {
      return {
          name: filename,
          time: fs.statSync(path.join(imagesDir, filename)).mtime.getTime()
      };
  }).sort((a, b) => b.time - a.time); // Sort descending

  // Get the latest file
  if (sortedFiles.length === 0) {
      console.error('No PNG files found in the images directory.');
      return;
  }
  const latestFile = sortedFiles[0].name;

  // Prepare the payload
  const filePath = path.join(imagesDir, latestFile);
  const fileContent = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', fileContent, latestFile);

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
