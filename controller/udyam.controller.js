import path from 'path';
import fs from 'fs';
import { convertUdyamHtmlToPdf } from '../utils/udyamCertificate.js';

export const downloadUdyamCertificate = async (req, res) => {
  try {
    const { udyamCertificateUrl } = req.body;

    if (!udyamCertificateUrl) {
      return res.status(400).json({
        success: false,
        message: 'Udyam certificate URL is required',
      });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'UdyamCertificates');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {
        recursive: true,
      });
    }

    const fileName = `udyam_${Date.now()}.pdf`;
    const outputPath = path.join(uploadDir, fileName);

    await convertUdyamHtmlToPdf(udyamCertificateUrl, outputPath);

    return res.status(200).json({
      success: true,
      message: 'Udyam certificate converted successfully',
      data: {
        fileName,
        filePath: `/uploads/UdyamCertificates/${fileName}`,
      },
    });
  } catch (error) {
    console.error('Udyam certificate error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to process Udyam certificate',
      error: error.message,
    });
  }
};
