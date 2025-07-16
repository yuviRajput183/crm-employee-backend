class SuccessResponse {
    /**
     * Sends a 200 OK response
     * @param {Object} res - Express response object
     * @param {string} [message] - Success message
     * @param {Object} [data] - Data to be sent in the response
     */
    ok(res, message, data) {
        if (!res || typeof res.status !== 'function') {
            throw new Error('Invalid response object');
        }
        const statusCode = 200;
        const response = {
            success: true,
            message: message || 'The request was successful',
            data: data ?? null
        };
        res.status(statusCode).send(response);
    }

    /**
     * Sends a 201 Created response
     * @param {Object} res - Express response object
     * @param {string} [message] - Success message
     * @param {Object} [data] - Data to be sent in the response
     */
    created(res, message, data) {
        if (!res || typeof res.status !== 'function') {
            throw new Error('Invalid response object');
        }
        const statusCode = 201;
        const response = {
            success: true,
            message: message || 'The request was successful and a new resource has been created',
            data: data || null
        };
        res.status(statusCode).send(response);
    }
}

export default new SuccessResponse();
