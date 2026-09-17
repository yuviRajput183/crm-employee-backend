import puppeteer from 'puppeteer';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

export const convertUdyamHtmlToPdf = async (htmlUrl, outputPath) => {
  let browser;

  try {
    // 1. Download HTML
    const response = await axios.get(htmlUrl, {
      responseType: 'text',
      timeout: 30000,
    });

    const html = response.data;

    if (!html || typeof html !== 'string') {
      throw new Error('Invalid Udyam certificate HTML response');
    }

    // 2. Start Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();

    // 3. Load HTML
    // Sometimes setContent misses external resources if they use relative paths, but for Udyam it's usually fine
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // 4. Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    return outputPath;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
