import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Downloads a file from a URL and saves it to a specified target directory.
 * @param {string} url - The URL to download the file from.
 * @param {string} dirName - The directory name inside uploads/ChannelPartnerDocuments/
 * @param {string} fileName - The filename to save it as (e.g. 'udyamCert.pdf').
 * @returns {Promise<string>} - Returns the public path (e.g. '/uploads/ChannelPartnerDocuments/dirName/fileName')
 */
export const downloadAndSaveDocument = async (url, dirName, fileName) => {
    try {
        const targetDir = path.join(process.cwd(), 'uploads', 'ChannelPartnerDocuments', dirName);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, fileName);
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(targetPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                resolve(`/uploads/ChannelPartnerDocuments/${dirName}/${fileName}`);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error("Error downloading and saving document:", error.message);
        throw error;
    }
};
