const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const logger = require('./logging');

class WebCapture {
	constructor() {
		this.driver = null;
		this.canvasElement = null;
		this.screenshot = null;
	}

	getRand() {
		return Math.floor(Math.random() * 999) + 1;
	}

	async initDriver(width, height) {
		let options = new chrome.Options();
		options.addArguments('--headless');
		options.addArguments('--disable-gpu');
		// options.addArguments('user-agent=Chrome/117.0.6045.55');
		let chrome_agent_str = `Chrome/119.${this.getRand()}.${this.getRand()}.${this.getRand()}`;
		let agent_str = `user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ${chrome_agent_str} Safari/537.36`;
		options.addArguments(agent_str);
		options.windowSize({ width, height });

		this.driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
	}

	async initDriver_headed(width, height) {
		let options = new chrome.Options();
		options.addArguments('--disable-gpu');
		let agent_str = `user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ${chrome_agent_str} Safari/537.36`;
		options.addArguments(agent_str);
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

	async captureBloomberg(url) {
		await this.initDriver(1200, 1800);

		try {
			await this.driver.get(url);

			logger.info(await this.driver.getTitle());

			// await this.driver.sleep(20000);
			// await this.driver.sleep(20000);
			let canvasElement = await this.driver.findElement(By.css('div[data-component="ticker-bar"]'));

			let screenshot1 = await canvasElement.takeScreenshot();

			canvasElement = await this.driver.findElement(By.css('div.zones_zones__YedWY'));

			let screenshot2 = await canvasElement.takeScreenshot();

			return [screenshot1, screenshot2];
		} catch(err) {
			logger.error('Error during capture: ', err);
		} finally {
			await this.driver.quit();
		}
	}
}

module.exports = WebCapture;