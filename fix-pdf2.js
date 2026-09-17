
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixPdf = async () => {
    const fileDir = path.join(__dirname, "uploads", "ChannelPartnerDocuments", "6aac2c31f01daa8dc977cbb7_yuvraj");
    const htmlPath = path.join(fileDir, "udyamCert.html");
    const pdfPath = path.join(fileDir, "udyamCert.pdf");

    if (fs.existsSync(htmlPath)) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            });
            const page = await browser.newPage();
            const htmlContent = fs.readFileSync(htmlPath, "utf-8");
            await page.setContent(htmlContent, { waitUntil: "networkidle0" });
            
            await page.pdf({
                path: pdfPath,
                format: "A4",
                printBackground: true,
                margin: {
                    top: "10mm",
                    right: "10mm",
                    bottom: "10mm",
                    left: "10mm"
                }
            });
            console.log("Successfully converted the HTML back to a real PDF.");
            // optionally leave the html file or remove it. I will rename it just in case.
            fs.renameSync(htmlPath, htmlPath + ".bak");
        } catch (e) {
            console.error(e);
        } finally {
            if (browser) await browser.close();
        }
    } else {
        console.log("HTML file not found");
    }
};

fixPdf();

