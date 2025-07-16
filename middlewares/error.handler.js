import fs from "fs";

/**
 * errorHandler - middleware for handleing error and enters the logs in the log file.
 * @param {Object} error - The error object.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
const errorHandler = (error, req, res, next) => {
    const statusCode = error.status || 500;
    const message = error.message || 'Internal Server Error';

    const errorLogStream = fs.createWriteStream('./logs/error.log', { flags: 'a' });
    const log = `[${new Date().toISOString()}] ${500} - ${message} - ${req.originalUrl} - ${req.method}`;
	errorLogStream.write(log + '\n');

    const response = {
        success: false,
        message: message,
        data: []
    };

    res.status(statusCode).send(response);
};

export default errorHandler;
