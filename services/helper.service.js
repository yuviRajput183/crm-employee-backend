
class helperService {
  /**
   * validateFields - Validates the required fields in the request body.
   * @param {Array} requiredFields - An array of required fields.
   * @param {Object} body - The request body.
   * @returns {Array} - An array of missing fields.
   */
  validateFields = (requiredFields, body) => {
    const missingFields = requiredFields.filter((field) => !(field in body));
    return missingFields;
  };
}

export default new helperService();