import Counter from "../models/Counter.model.js";

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

  async getNextSequence(name) {
    const counter = await Counter.findOneAndUpdate(
      { name },
      { $inc: { seq: 1 }},
      { new: true, upsert: true }
    );

    return counter.seq;
  }
}

export default new helperService();