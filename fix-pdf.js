
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixPdf = async () => {
    const fileDir = path.join(__dirname, "uploads", "ChannelPartnerDocuments", "6aac2c31f01daa8dc977cbb7_yuvraj");
    const corruptPath = path.join(fileDir, "udyamCert.pdf");
    const htmlPath = path.join(fileDir, "temp.html");

    if (fs.existsSync(corruptPath)) {
        fs.renameSync(corruptPath, htmlPath);
        
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
                path: corruptPath,
                format: "A4",
                printBackground: true,
                margin: {
                    top: "10mm",
                    right: "10mm",
                    bottom: "10mm",
                    left: "10mm"
                }
            });
            console.log("Successfully converted the corrupt PDF (HTML) to a real PDF.");
            fs.unlinkSync(htmlPath);
        } catch (e) {
            console.error(e);
        } finally {
            if (browser) await browser.close();
        }
    } else {
        console.log("File not found");
    }
};

fixPdf();

