import CibilReport from "../models/CibilReport.model.js";
import surepassService from "./surepass.service.js";
import path from "path";
import fs from "fs";
import axios from "axios";

/**
 * Downloads a file and saves it
 */
const downloadPdf = async (url, bureau, clientId) => {
    try {
        const targetDir = path.join(process.cwd(), 'uploads', 'CibilReports', bureau);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const timestamp = Date.now();
        const fileName = `${bureau}_${clientId}_${timestamp}.pdf`;
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
                resolve({
                    pdfPath: `/uploads/CibilReports/${bureau}/${fileName}`,
                    pdfFileName: fileName
                });
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading PDF for ${bureau}:`, error.message);
        throw error;
    }
};

class CibilReportService {
    async generateTransUnion(data, employeeId) {
        // Prepare surepass payload
        const payload = {
            mobile: data.mobile,
            pan: data.pan,
            name: data.name,
            gender: data.gender,
            consent: data.consent
        };

        const response = await surepassService.generateTransUnionReport(payload);
        if (!response.success || !response.data) {
            throw new Error(response.message || "Failed to generate TransUnion report");
        }

        const { client_id, credit_score, credit_report_link } = response.data;
        if (!credit_report_link) {
             throw new Error("Credit report link not provided by Surepass");
        }

        const { pdfPath, pdfFileName } = await downloadPdf(credit_report_link, "TransUnion", client_id);

        const newReport = new CibilReport({
            bureau: "TRANSUNION",
            name: response.data.name || data.name,
            mobile: response.data.mobile || data.mobile,
            pan: response.data.pan || data.pan,
            gender: response.data.gender || data.gender,
            creditScore: credit_score,
            clientId: client_id,
            pdfPath,
            pdfFileName,
            generatedBy: employeeId
        });

        await newReport.save();
        return newReport;
    }

    async generateEquifax(data, employeeId) {
        const payload = {
            name: data.name,
            id_number: data.pan,
            id_type: "pan",
            mobile: data.mobile,
            consent: data.consent,
            gender: data.gender
        };

        const response = await surepassService.generateEquifaxReport(payload);
        if (!response.success || !response.data) {
            throw new Error(response.message || "Failed to generate Equifax report");
        }

        const { client_id, credit_score, credit_report_link, name, mobile, id_number } = response.data;
        if (!credit_report_link) {
             throw new Error("Credit report link not provided by Surepass");
        }

        const { pdfPath, pdfFileName } = await downloadPdf(credit_report_link, "Equifax", client_id);

        const newReport = new CibilReport({
            bureau: "EQUIFAX",
            name: name || data.name,
            mobile: mobile || data.mobile,
            pan: id_number || data.pan,
            gender: data.gender,
            creditScore: credit_score,
            clientId: client_id,
            pdfPath,
            pdfFileName,
            generatedBy: employeeId
        });

        await newReport.save();
        return newReport;
    }

    async generateExperian(data, employeeId) {
        const payload = {
            name: data.name,
            mobile: data.mobile,
            pan: data.pan,
            consent: data.consent
        };

        const response = await surepassService.generateExperianReport(payload);
        if (!response.success || !response.data) {
            throw new Error(response.message || "Failed to generate Experian report");
        }

        const { client_id, credit_score, credit_report_link, name, mobile, pan } = response.data;
        if (!credit_report_link) {
             throw new Error("Credit report link not provided by Surepass");
        }

        const { pdfPath, pdfFileName } = await downloadPdf(credit_report_link, "Experian", client_id);

        const newReport = new CibilReport({
            bureau: "EXPERIAN",
            name: name || data.name,
            mobile: mobile || data.mobile,
            pan: pan || data.pan,
            creditScore: credit_score,
            clientId: client_id,
            pdfPath,
            pdfFileName,
            generatedBy: employeeId
        });

        await newReport.save();
        return newReport;
    }

    async generateCrif(data, employeeId) {
        const payload = {
            first_name: data.first_name,
            last_name: data.last_name,
            mobile: data.mobile,
            pan: data.pan,
            consent: data.consent,
            raw: false
        };

        const response = await surepassService.generateCrifReport(payload);
        if (!response.success || !response.data) {
            throw new Error(response.message || "Failed to generate CRIF report");
        }

        const { client_id, credit_score, credit_report_link, first_name, last_name, mobile, pan } = response.data;
        if (!credit_report_link) {
             throw new Error("Credit report link not provided by Surepass");
        }

        const { pdfPath, pdfFileName } = await downloadPdf(credit_report_link, "CRIF", client_id);

        const newReport = new CibilReport({
            bureau: "CRIF",
            name: `${first_name || data.first_name} ${last_name || data.last_name}`,
            firstName: first_name || data.first_name,
            lastName: last_name || data.last_name,
            mobile: mobile || data.mobile,
            pan: pan || data.pan,
            creditScore: credit_score,
            clientId: client_id,
            pdfPath,
            pdfFileName,
            generatedBy: employeeId
        });

        await newReport.save();
        return newReport;
    }

    async getHistory(bureau, query) {
        const { page = 1, limit = 10, search = '', name = '', mobile = '', pan = '' } = query;
        const skip = (page - 1) * limit;

        const match = { bureau };
        
        if (search) {
            match.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { pan: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (name) match.name = { $regex: name, $options: 'i' };
        if (mobile) match.mobile = { $regex: mobile, $options: 'i' };
        if (pan) match.pan = { $regex: pan, $options: 'i' };

        const reports = await CibilReport.find(match)
            .sort({ generatedAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await CibilReport.countDocuments(match);

        return {
            reports,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }
}

export default new CibilReportService();
