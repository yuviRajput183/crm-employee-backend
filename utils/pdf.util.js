import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const convertHtmlToPdf = async (htmlUrl, outputPath) => {
    let browser;
    try {
        const response = await axios.get(htmlUrl, {
            responseType: 'text',
            timeout: 30000
        });

        const html = response.data;
        if (!html || typeof html !== 'string') {
            throw new Error('Invalid HTML response');
        }

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setContent(html, {
            waitUntil: 'networkidle0'
        });

        const targetDir = path.dirname(outputPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            }
        });

        return outputPath;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
