const express = require('express');
const puppeteer = require('puppeteer-extra');
const cors = require('cors');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(stealthPlugin());  // Add the stealth plugin

const app = express();
const PORT = 5000;

app.use(cors());

async function scrapeProduct(product) {
  const browser = await puppeteer.launch({ headless: false });  // Running in non-headless mode to debug
  const page = await browser.newPage();

  let results = [];

  // Scrape Amazon for the product
  const scrapeAmazon = async () => {
    try {
      await page.goto(`https://www.amazon.com/s?k=${product}`, { waitUntil: 'networkidle2' });
      
      // Wait for the price element to appear
      await page.waitForSelector('.a-price-whole', { timeout: 10000 });

      const amazonPrice = await page.evaluate(() => {
        const priceElement = document.querySelector('.a-price-whole');
        return priceElement ? priceElement.innerText : null;
      });

      if (amazonPrice) {
        results.push({ website: 'Amazon', price: amazonPrice });
      } else {
        console.log('No price found on Amazon for', product);
      }
    } catch (error) {
      console.error('Error scraping Amazon:', error);
    }
  };

  // Scrape eBay for the product
  const scrapeEbay = async () => {
    try {
      await page.goto(`https://www.ebay.com/sch/i.html?_nkw=${product}`, { waitUntil: 'networkidle2' });
      
      // Wait for the price element to appear
      await page.waitForSelector('.s-item__price', { timeout: 10000 });

      const ebayPrice = await page.evaluate(() => {
        const priceElement = document.querySelector('.s-item__price');
        return priceElement ? priceElement.innerText : null;
      });

      if (ebayPrice) {
        results.push({ website: 'eBay', price: ebayPrice });
      } else {
        console.log('No price found on eBay for', product);
      }
    } catch (error) {
      console.error('Error scraping eBay:', error);
    }
  };

  // Scrape Walmart for the product
  const scrapeWalmart = async () => {
    try {
      await page.goto(`https://www.walmart.com/search/?query=${product}`, { waitUntil: 'networkidle2' });

      // Wait for the price element to appear
      await page.waitForSelector('.price-main .visuallyhidden', { timeout: 10000 });

      const walmartPrice = await page.evaluate(() => {
        const priceElement = document.querySelector('.price-main .visuallyhidden');
        return priceElement ? priceElement.innerText : null;
      });

      if (walmartPrice) {
        results.push({ website: 'Walmart', price: walmartPrice });
      } else {
        console.log('No price found on Walmart for', product);
      }
    } catch (error) {
      console.error('Error scraping Walmart:', error);
    }
  };

  // Run all scraping functions in parallel
  await Promise.all([scrapeAmazon(), scrapeEbay(), scrapeWalmart()]);

  await browser.close();
  return results;
}

// API endpoint for product search
app.get('/search', async (req, res) => {
  const product = req.query.product;
  if (!product) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    const prices = await scrapeProduct(product);
    res.json({ name: product, prices });
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'Failed to scrape product prices' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
