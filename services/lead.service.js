import ErrorResponse from "../lib/error.res.js";
import Employee from "../models/Employee.model.js";
import Lead from "../models/Lead.model.js";
import moment from "moment";
import helperService from "./helper.service.js";
import Advisor from "../models/Advisor.model.js";
import Banker from "../models/banker.model.js";
import path from "path";
import fs from "fs";
import Draft from "../models/Draft.model.js";

class LeadService {
  /**
   * addLead - Add a new lead. Admin or Super admin send the employeeId in allocatedTo field. If the logged in user is employee, allocatedTo field is set to the id of logged in employee. Add the advisorId in the advisor field.
   * @param {body(productType, loanRequirementAmount, clientName, mobileNo, emailId, dob, panNo, aadharNo, maritalStatus, spouseName, motherName, otherContactNo, qualification, residenceType, residentialAddress, residentialAddressTakenFrom, residentialStability, stateName, cityName, pinCode, companyName, designation, companyAddress, netSalary, salaryTransferMode, jobPeriod, totalJobExperience, officialEmailId, officialNumber, noOfDependent, creditCardOutstandingAmount, runningLoans, references, documents, history, password, allocatedTo)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addLead(req, res, next) {
    const data = { ...req.body };

    const employee = await Employee.findById(req.user.referenceId);

    if (!employee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    // check mobile no is unique
    // const existingLead = await Lead.findOne({ mobileNo: data.mobileNo });
    // if (existingLead) {
    //   return next(ErrorResponse.badRequest("Mobile number already exists"));
    // }

    const leadNo = await helperService.getNextSequence("leadSerial");
    data.leadNo = leadNo;

    if (data.runningLoans) {
      try {
        data.runningLoans = JSON.parse(data.runningLoans);
      } catch (err) {
        return next(ErrorResponse.badRequest("Invalid JSON in runningLoans"));
      }
    }

    if (data.references) {
      try {
        data.references = JSON.parse(data.references);
      } catch (err) {
        return next(ErrorResponse.badRequest("Invalid JSON in references"));
      }
    }

    data.history = [
      {
        feedback: data.feedback || "Allocated",
        commentBy: employee.name,
        commentDate: moment().format("DD/MM/YYYY-hh:mm A"),
        remarks: "",
        replyDate: "",
        advisorReply: "",
      },
    ];

    if (req.files && req.files.length > 0) {
      data.documents = req.files.map(file => ({
        attachmentType: data.attachmentType || "Document",
        fileUrl: file.path,
        password: data.password || null,
      }));
    }

    if (employee.role?.toLowerCase() === "employee") {
      data.allocatedTo = employee._id;
    }

    data.createdBy = employee._id;

    const newLead = await Lead.create(data);

    return {
      data: newLead,
      message: "Lead created successfully",
    };
  }

  /**
   * getAllNewLeads - Super admin and admin can fetch all new leads and their stats.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllNewLeads(req, res, next) {
    const {
      productType,
      advisorName,
      clientName,
      feedback,
      allocatedTo,
      fromDate,
      toDate,
      page = 1,
      limit = 1000,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filters = {};

    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    if (clientName) {
      filters.clientName = { $regex: clientName, $options: "i" };
    }

    if (productType) {
      filters.productType = {
        $regex: productType,
        $options: "i",
      };
    }

    // if (allocatedTo) {
    //   filters.allocatedTo = allocatedTo;
    // }
    const user = await Employee.findById(req.user.referenceId);

    if (user.role === "employee") {
      filters.allocatedTo = req.user.referenceId;
    }

    if (user.role === "admin" && allocatedTo) {
      filters.allocatedTo = allocatedTo;
    }

    const leads = await Lead.find(filters)
      .populate("advisorId")
      .populate("allocatedTo")
      .sort({ createdAt: -1 });

    const validFeedbacks = [
      "Allocated",
      "Docs Query",
      "Approved",
      "Under Process",
    ];

    const filteredLeads = leads.filter((lead) => {
      const lastHistory = lead.history?.[lead.history.length - 1];
      if (!lastHistory) return false;

      const matchFeedback = validFeedbacks.includes(lastHistory.feedback);
      const matchFeedbackQuery = feedback
        ? lastHistory.feedback.toLowerCase() === feedback.toLowerCase()
        : true;

      const matchAdvisorName = advisorName
        ? lead.advisorId?.name
            ?.toLowerCase()
            .includes(advisorName.toLowerCase())
        : true;

      return matchFeedback && matchFeedbackQuery && matchAdvisorName;
    });

    const totalLeads = filteredLeads.length;

    const feedbackStats = {
      Allocated: 0,
      "Docs Query": 0,
      Approved: 0,
      "Under Process": 0,
    };

    filteredLeads.forEach((lead) => {
      const lastHistory = lead.history?.[lead.history.length - 1];

      if (lastHistory && feedbackStats.hasOwnProperty(lastHistory.feedback)) {
        feedbackStats[lastHistory.feedback]++;
      }
    });

    const percentageStats = {};
    Object.keys(feedbackStats).forEach((key) => {
      const count = feedbackStats[key];
      percentageStats[key] = {
        count,
        percentage:
          totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(2) + "%" : "0%",
      };
    });

    const paginatedLeads = filteredLeads.slice(skip, skip + parsedLimit);

    return {
      data: {
        total: totalLeads,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalLeads / parsedLimit),
        leads: paginatedLeads,
        stats: percentageStats,
      },
      message: "New Leads retrieved successfully",
    };
  }

  /**
   * getSignleNewLead - Super admin and admin can fetch a single new lead, my lead and advisor on the basis of the leadId.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getSignleLead(req, res, next) {
    const leadId = req.params.leadId;
    let lead = await Lead.findById(leadId)
      .populate("advisorId", "_id name")
      .populate("allocatedTo", "_id name")
      .populate("createdBy", "_id name");

    if (!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    if (lead.bankerId) {
      lead = await lead.populate({
        path: "bankerId",
        populate: [{ path: "bank" }, { path: "city" }],
      });
    }
    return {
      data: lead,
      message: "Lead retrieved successfully",
    };
  }

  /**
   * editLeadAdvisor - Edit an advisor assigned to the lead.
   * @param {body(advisorId)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editLeadAdvisor(req, res, next) {
    const leadId = req.params.leadId;
    const { advisorId } = req.body;

    const advisor = await Advisor.findById(advisorId);

    if (!advisor) {
      return next(ErrorResponse.notFound("Advisor not found"));
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { advisorId: advisorId },
      { new: true }
    ).populate("allocatedTo", "_id name");

    if (!updatedLead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    return {
      data: updatedLead,
      message: "Lead updated successfully",
    };
  }

  /**
   * editLead - Edit a lead.
   * @param {body(productType, loanRequirementAmount, clientName, mobileNo, emailId, dob, panNo, aadharNo, maritalStatus, spouseName, motherName, otherContactNo, qualification, residenceType, residentialAddress, residentialAddressTakenFrom, residentialStability, stateName, cityName, pinCode, companyName, designation, companyAddress, netSalary, salaryTransferMode, jobPeriod, totalJobExperience, officialEmailId, officialNumber, noOfDependent, creditCardOutstandingAmount, runningLoans, references, documents, history, password, allocatedTo)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editLead(req, res, next) {
    const leadId = req.params.leadId;
    const updates = { ...req.body };

    const existingLead = await Lead.findById(leadId);
    if (!existingLead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    // Check mobile no is unique
    // if (updates.mobileNo && updates.mobileNo !== existingLead.mobileNo) {
    //   const existingLeadMobile = await Lead.findOne({
    //     mobileNo: updates.mobileNo,
    //   });
    //   if (existingLeadMobile && existingLeadMobile._id.toString() !== leadId) {
    //     return next(ErrorResponse.badRequest("Mobile number already exists"));
    //   }
    // }

    const employee = await Employee.findById(req.user.referenceId);
    if (!employee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const newHistoryEntry = {};
    let shouldAddHistory = false;
    if (
      updates.allocatedTo &&
      updates.allocatedTo !== existingLead.allocatedTo?.toString()
    ) {
      newHistoryEntry.feedback =
        updates.feedback || existingLead.feedback || "";
      newHistoryEntry.commentBy = employee.name;
      newHistoryEntry.commentDate = moment().format("DD/MM/YYYY-hh:mm A");
      newHistoryEntry.remarks = "Re-allocated";
      newHistoryEntry.replyDate = "";
      newHistoryEntry.advisorReply = "";
      shouldAddHistory = true;
    } else if (updates.feedback || updates.remarks) {
      newHistoryEntry.feedback = updates.feedback
        ? updates.feedback
        : existingLead.feedback;
      newHistoryEntry.commentBy = employee.name;
      newHistoryEntry.commentDate = moment().format("DD/MM/YYYY-hh:mm A");
      newHistoryEntry.remarks = updates.remarks || "";
      newHistoryEntry.replyDate = "";
      newHistoryEntry.advisorReply = "";
      shouldAddHistory = true;
    }

    const parseJSONField = (field) => {
      if (updates[field] && typeof updates[field] === "string") {
        try {
          updates[field] = JSON.parse(updates[field]);
        } catch {
          return next(ErrorResponse.badRequest(`Invalid JSON in ${field}`));
        }
      }
    };

    parseJSONField("runningLoans");
    parseJSONField("references");
    parseJSONField("documents");

    if (req.files && req.files.length > 0) {
      const newDocs = req.files.map(file => ({
        attachmentType: updates.attachmentType || existingLead.attachmentType || "Document",
        fileUrl: file.path,
        password: updates.password || existingLead.password || null,
      }));
      existingLead.documents = existingLead.documents ? [...existingLead.documents, ...newDocs] : newDocs;
    }

    // attach banker details if feedback last field is "loan disbursed"
    if (updates.feedback === "Loan Disbursed" && updates.bankerId) {
      existingLead.bankerId = updates.bankerId;
    }

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        existingLead[key] = updates[key];
      }
    }

    if (shouldAddHistory) {
      existingLead.history.push(newHistoryEntry);
    }

    existingLead.updatedBy = req.user.referenceId;

    const updatedLead = await existingLead.save();

    return {
      data: updatedLead,
      message: "Lead updated successfully",
    };
  }

  /**
   * bankerCitiesByStateName - Get all cities in a state which are associated with bankers.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async bankerCitiesByStateName(req, res, next) {
    const { stateName } = req.query;
    const userId = req.user.referenceId;

    if (!stateName) {
      return next(ErrorResponse.badRequest("State name is required"));
    }

    const currentUser = await Employee.findById(userId).select("groupId");
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in user not found"));
    }

    const bankers = await Banker.find({
      stateName: stateName,
      createdBy: currentUser.groupId,
    }).populate("city");

    const uniqueCities = [];
    const seen = new Set();

    for (const b of bankers) {
      if (b.city && !seen.has(b.city._id.toString())) {
        seen.add(b.city._id.toString());
        uniqueCities.push(b.city);
      }
    }

    return {
      data: uniqueCities,
      message: `Cities for state '${stateName}' fetched successfully`,
    };
  }

  /**
   * getBanksByCityId - Get all banks associated with a city and product type.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getBanksByCityId(req, res, next) {
    const { cityId, leadId } = req.query;
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId).select("groupId");
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in user not found"));
    }

    const lead = await Lead.findById(leadId).select("productType");
    if (!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    const leadType = lead.productType?.trim();
    if (!leadType) {
      return next(ErrorResponse.badRequest("Lead type is required"));
    }

    const banks = await Banker.find({
      createdBy: currentUser.groupId,
      city: cityId,
      product: leadType,
    }).populate("bank");

    const uniqueBanks = [];
    const seen = new Set();

    for (const b of banks) {
      if (b.bank && !seen.has(b.bank._id.toString())) {
        seen.add(b.bank._id.toString());
        uniqueBanks.push(b.bank);
      }
    }

    return {
      data: uniqueBanks,
      message: `Banks for city '${cityId}' and lead type '${leadType}' fetched successfully`,
    };
  }

  /**
   * getBankersByBankId - Get Bankers for bank, city, and lead type.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getBankersByBankId(req, res, next) {
    const { bankId, cityId, leadId } = req.query;
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId).select("groupId");
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in user not found"));
    }

    const lead = await Lead.findById(leadId).select("productType");
    if (!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    const leadType = lead.productType?.trim();
    if (!leadType) {
      return next(ErrorResponse.badRequest("Lead type not found"));
    }

    const bankers = await Banker.find({
      createdBy: currentUser.groupId,
      bank: bankId,
      city: cityId,
      product: leadType,
    });

    return {
      data: bankers,
      message: `Bankers for bank '${bankId}', city '${cityId}', and lead type '${leadType}' fetched successfully`,
    };
  }

  /**
   * getBankerByBankerId - Get a single banker by ID.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getBankerByBankerId(req, res, next) {
    const { bankerId } = req.query;
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId).select("groupId");
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in user not found"));
    }

    const banker = await Banker.findById(bankerId)
      .populate("city", "cityName stateName")
      .populate("bank", "name");

    if (!banker) {
      return next(ErrorResponse.notFound("Banker not found"));
    }

    if (banker.createdBy.toString() !== currentUser._id.toString()) {
      return next(
        ErrorResponse.forbidden("You are not authorized to view this banker")
      );
    }
    return {
      data: banker,
      message: "Banker fetched successfully",
    };
  }

  /**
   * getAllMyLeads - Super admin and admin can fetch all my leads and their stats.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllMyLeads(req, res, next) {
    const {
      productType,
      advisorName,
      clientName,
      feedback,
      allocatedTo,
      fromDate,
      toDate,
      page = 1,
      limit = 100,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filters = {};

    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    if (clientName) {
      filters.clientName = { $regex: clientName, $options: "i" };
    }

    if (productType) {
      filters.productType = {
        $regex: productType,
        $options: "i",
      };
    }

    // if (allocatedTo) {
    //   filters.allocatedTo = allocatedTo;
    // }
    const user = await Employee.findById(req.user.referenceId);

    if (user.role === "employee") {
      filters.allocatedTo = req.user.referenceId;
    }

    if (user.role === "admin" && allocatedTo) {
      filters.allocatedTo = allocatedTo;
    }

    const leads = await Lead.find(filters)
      .populate("advisorId")
      .populate("allocatedTo")
      .sort({ createdAt: -1 });

    const validFeedbacks = [
      "Loan Disbursed",
      "Policy Issued",
      "Invoice Raised",
      "Loan Rejected",
    ];

    const filteredLeads = leads.filter((lead) => {
      const lastHistory = lead.history?.[lead.history.length - 1];
      if (!lastHistory) return false;

      const matchFeedback = validFeedbacks.includes(lastHistory.feedback);

      const matchFeedbackQuery = feedback
        ? lastHistory.feedback.toLowerCase() === feedback.toLowerCase()
        : true;

      const matchAdvisorName = advisorName
        ? lead.advisorId?.name
            ?.toLowerCase()
            .includes(advisorName.toLowerCase())
        : true;

      return matchFeedback && matchFeedbackQuery && matchAdvisorName;
    });

    const totalLeads = filteredLeads.length;

    const feedbackStats = {
      "Loan Disbursed": 0,
      "Policy Issued": 0,
      "Invoice Raised": 0,
      "Loan Rejected": 0,
    };

    filteredLeads.forEach((lead) => {
      const lastHistory = lead.history?.[lead.history.length - 1];

      if (lastHistory && feedbackStats.hasOwnProperty(lastHistory.feedback)) {
        feedbackStats[lastHistory.feedback]++;
      }
    });

    const percentageStats = {};
    Object.keys(feedbackStats).forEach((key) => {
      const count = feedbackStats[key];
      percentageStats[key] = {
        count,
        percentage:
          totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(2) + "%" : "0%",
      };
    });

    const paginatedLeads = filteredLeads.slice(skip, skip + parsedLimit);

    return {
      data: {
        total: totalLeads,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalLeads / parsedLimit),
        leads: paginatedLeads,
        stats: percentageStats,
      },
      message: "My Leads retrieved successfully",
    };
  }

  /**
   * getCustomersByAdvisorId - Get all customers associated with an advisor and loan type.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getCustomersName(req, res, next) {
    const { advisorId, productType } = req.query;

    if (!advisorId && !productType) {
      return {
        data: [],
        message: "No advisor or product type provided",
      };
    }

    const query = {};
    if (advisorId) {
      query.advisorId = advisorId;
    }
    if (productType) {
      query.productType = productType;
    }

    const customers = await Lead.find(query)
      .select("_id clientName")
      .sort({ clientName: 1 });

    return {
      data: customers,
      message: "Customers retrieved successfully",
    };
  }

  /**
   * getAllLeads - Super admin and admin can fetch all leads.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllLeads(req, res, next) {
    const {
      productType,
      feedback,
      advisorName,
      fromDate,
      toDate,
      page = 1,
      limit = 100,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filters = {};

    if (productType) {
      filters.productType = {
        $regex: productType,
        $options: "i",
      };
    }

    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    let leads = await Lead.find(filters)
      .populate("advisorId")
      .populate("allocatedTo")
      .sort({ createdAt: -1 });

    if (feedback) {
      leads = leads.filter((lead) => {
        const lastHistory = lead.history?.[lead.history.length - 1];
        return lastHistory?.feedback?.toLowerCase() === feedback.toLowerCase();
      });
    }

    if (advisorName) {
      leads = leads.filter((lead) => {
        return lead.advisorId?.name
          ?.toLowerCase()
          .includes(advisorName.toLowerCase());
      });
    }

    const paginatedLeads = leads.slice(skip, skip + parsedLimit);

    const totalCount = leads.length;
    const totalPages = Math.ceil(totalCount / parsedLimit);

    return {
      data: {
        total: totalCount,
        currentPage: parsedPage,
        totalPages: totalPages,
        leads: paginatedLeads,
      },
      message: "Leads retrieved successfully",
    };
  }

  /**
   * deleteAllLeadAttachments - Delete all attachments associated with a lead.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async deleteAllLeadAttachments(req, res, next) {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return next(ErrorResponse.badRequest("leadIds array is required"));
    }

    const leads = await Lead.find({ _id: { $in: leadIds } });

    if (!leads || leads.length === 0) {
      return next(ErrorResponse.notFound("No leads found for the given IDs"));
    }

    for (const lead of leads) {
      if (lead.documents && lead.documents.length > 0) {
        for (const doc of lead.documents) {
          const filePath = path.join(process.cwd(), doc.fileUrl);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }

      lead.documents = [];
      await lead.save();
    }

    return {
      data: leads,
      message:
        "All attached documents deleted successfully from selected leads",
    };
  }

  /**
   * addDraft - Advisor can add a draft lead.
   * @param {body(productType, loanRequirementAmount, clientName, mobileNo, emailId, dob, panNo, aadharNo, maritalStatus, spouseName, motherName, otherContactNo, qualification, residenceType, residentialAddress, residentialAddressTakenFrom, residentialStability, stateName, cityName, pinCode, companyName, designation, companyAddress, netSalary, salaryTransferMode, jobPeriod, totalJobExperience, officialEmailId, officialNumber, noOfDependent, creditCardOutstandingAmount, runningLoans, references, documents, history, password, allocatedTo)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addDraft(req, res, next) {
    const data = { ...req.body };

    const advisor = await Advisor.findById(req.user.referenceId);

    if (!advisor) {
      return next(ErrorResponse.notFound("Advisor not found"));
    }

    if (data.runningLoans) {
      try {
        data.runningLoans = JSON.parse(data.runningLoans);
      } catch (err) {
        return next(ErrorResponse.badRequest("Invalid JSON in runningLoans"));
      }
    }

    if (data.references) {
      try {
        data.references = JSON.parse(data.references);
      } catch (err) {
        return next(ErrorResponse.badRequest("Invalid JSON in references"));
      }
    }

    if (req.files && req.files.length > 0) {
      data.documents = req.files.map(file => ({
        attachmentType: data.attachmentType || "Document",
        fileUrl: file.path,
        password: data.password || null,
      }));
    }

    data.advisorId = advisor._id;
    data.createdBy = advisor._id;

    const newDraft = await Draft.create(data);

    return {
      data: newDraft,
      message: "Draft created successfully",
    };
  }

  /**
   * getAllDrafts - Get all the drafts of the logged in advisor.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllDrafts(req, res, next) {
    const { search } = req.query;

    const query = {
      advisorId: req.user.referenceId,
    };

    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: "i" } },
        { productType: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
        { emailId: { $regex: search, $options: "i" } },
      ];
    }

    const drafts = await Draft.find(query).sort({ createdAt: -1 });

    return {
      data: drafts,
      message: "Advisor drafts retrieved successfully",
    };
  }

  /**
   * getSignleDraft - Get a single draft of the logged in advisor.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getSignleDraft(req, res, next) {
    const draftId = req.params.draftId;
    let draft = await Draft.findById(draftId).populate("advisorId", "_id name");

    if (!draft) {
      return next(ErrorResponse.notFound("Draft not found"));
    }

    return {
      data: draft,
      message: "Draft retrieved successfully",
    };
  }

  /**
   * addLead - Add a new lead. Admin or Super admin send the employeeId in allocatedTo field. If the logged in user is employee, allocatedTo field is set to the id of logged in employee. Add the advisorId in the advisor field.
   * @param {body(productType, loanRequirementAmount, clientName, mobileNo, emailId, dob, panNo, aadharNo, maritalStatus, spouseName, motherName, otherContactNo, qualification, residenceType, residentialAddress, residentialAddressTakenFrom, residentialStability, stateName, cityName, pinCode, companyName, designation, companyAddress, netSalary, salaryTransferMode, jobPeriod, totalJobExperience, officialEmailId, officialNumber, noOfDependent, creditCardOutstandingAmount, runningLoans, references, documents, history, password, allocatedTo)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async advisorLead(req, res, next) {
    const data = { ...req.body };

    const advisor = await Advisor.findById(req.user.referenceId);
    if (!advisor) {
      return next(ErrorResponse.notFound("Advisor not found"));
    }
    const leadNo = await helperService.getNextSequence("leadSerial");
    data.leadNo = leadNo;
    if (data.runningLoans) {
      try {
        data.runningLoans = JSON.parse(data.runningLoans);
      } catch (err) {
        return next(ErrorResponse.badRequest("Invalid JSON in runningLoans"));
      }
    }
    if (data.references) {
      try {
        data.references = JSON.parse(data.references);
      } catch (err) {
        return next(ErrorResponse.badRequest("Invalid JSON in references"));
      }
    }
    data.history = [
      {
        feedback: data.feedback || "Allocated",
        commentBy: advisor.name,
        commentDate: moment().format("DD/MM/YYYY-hh:mm A"),
        remarks: "",
        replyDate: "",
        advisorReply: "",
      },
    ];
    
    if (req.files && req.files.length > 0) {
      data.documents = req.files.map(file => ({
        attachmentType: data.attachmentType || "Document",
        fileUrl: file.path,
        password: data.password || null,
      }));
    }

    data.allocatedTo = null;
    data.advisorId = advisor._id;
    data.createdBy = advisor._id;

    const newLead = await Lead.create(data);

    return {
      data: newLead,
      message: "Lead created successfully",
    };
  }

  /**
   * getAllMyLeads - Super admin and admin can fetch all my leads and their stats.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAdvisorLeads(req, res, next) {
    const {
      productType,
      feedback,
      fromDate,
      toDate,
      search, // Added search parameter
      page = 1,
      limit = 10,
    } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // 1. Core Security Filter: Only leads created by/for this advisor
    const filters = {
      advisorId: req.user.referenceId,
    };

    // 2. Date Range Filters
    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    // 4. Product Type Filter
    if (productType) {
      filters.productType = { $regex: productType, $options: "i" };
    }

    // Execute Query
    const leads = await Lead.find(filters)
      .populate("advisorId")
      .populate("allocatedTo")
      .sort({ createdAt: -1 });

    // 5. Feedback Filtering (Last History State)
    const validFeedbacks = [
      "Loan Disbursed",
      "Policy Issued",
      "Invoice Raised",
      "Loan Rejected",
      "Allocated",
      "Docs Query",
      "Approved",
      "Under Process",
    ];
    const filteredLeads = leads.filter((lead) => {
      const lastHistory = lead.history?.[lead.history.length - 1];
      if (!lastHistory) return false;
      const isSystemFeedback = validFeedbacks.includes(lastHistory.feedback);
      const matchesFeedbackQuery = feedback
        ? lastHistory.feedback.toLowerCase() === feedback.toLowerCase()
        : true;

      return isSystemFeedback && matchesFeedbackQuery;
    });

    // 6. Statistics Calculation
    const totalLeads = filteredLeads.length;
    const feedbackStats = {};
    validFeedbacks.forEach((f) => (feedbackStats[f] = 0));

    filteredLeads.forEach((lead) => {
      const lastHistory = lead.history?.[lead.history.length - 1];
      if (lastHistory && feedbackStats.hasOwnProperty(lastHistory.feedback)) {
        feedbackStats[lastHistory.feedback]++;
      }
    });

    const percentageStats = {};
    Object.keys(feedbackStats).forEach((key) => {
      const count = feedbackStats[key];
      percentageStats[key] = {
        count,
        percentage:
          totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(2) + "%" : "0%",
      };
    });

    // 7. Manual Pagination (since we filtered in JS memory)
    const paginatedLeads = filteredLeads.slice(skip, skip + parsedLimit);

    return {
      data: {
        total: totalLeads,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalLeads / parsedLimit),
        leads: paginatedLeads,
        stats: percentageStats,
      },
      message: "Advisor leads retrieved successfully",
    }
  }

  /**
   * getLeadStatistics - Get statistics for leads.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getLeadStatistics(req, res, next) {
    try {
      // Fetch all leads with necessary fields
      const leads = await Lead.find({})
        .select("history loanRequirementAmount insuranceAmount amount productType")
        .lean();

      return this._calculateLeadStats(leads);
    } catch (error) {
      next(error);
    }
  }

  /**
   * getEmployeeStatistics - Get statistics for leads allocated to the logged-in employee.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getEmployeeStatistics(req, res, next) {
    try {
      const leads = await Lead.find({ allocatedTo: req.user.referenceId })
        .select("history loanRequirementAmount insuranceAmount amount productType")
        .lean();

      return this._calculateLeadStats(leads);
    } catch (error) {
      next(error);
    }
  }

  /**
   * getAdvisorStatistics - Get statistics for leads associated with the logged-in advisor.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAdvisorStatistics(req, res, next) {
    try {
      const leads = await Lead.find({ advisorId: req.user.referenceId })
        .select("history loanRequirementAmount insuranceAmount amount productType")
        .lean();

      return this._calculateLeadStats(leads);
    } catch (error) {
      next(error);
    }
  }

  // Helper method to calculate stats
  _calculateLeadStats(leads) {
    const totalLeads = leads.length;

    let underProcessCount = 0;
    let approvedCount = 0;
    let disbursedCount = 0;

    let totalDisbursalAmount = 0;
    let totalDisbursalAmountThisMonth = 0;
    let totalDisbursalAmountThisYear = 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    leads.forEach((lead) => {
      const lastHistory = lead.history?.[lead.history.length - 1];
      if (!lastHistory) return;

      const feedback = lastHistory.feedback;

      if (feedback === "Under Process") {
        underProcessCount++;
      } else if (feedback === "Approved") {
        approvedCount++;
      } else if (feedback === "Loan Disbursed" || feedback === "Policy Issued" || feedback === "Invoice Raised") {
        disbursedCount++;

        // Calculate disbursal amount
        let amount = 0;
        if (lead.loanRequirementAmount) {
          amount = lead.loanRequirementAmount;
        } else if (lead.insuranceAmount) {
          amount = lead.insuranceAmount;
        } else if (lead.amount) {
          amount = lead.amount;
        }

        totalDisbursalAmount += amount;

        // Parse commentDate (format: DD/MM/YYYY-hh:mm A)
        const dateString = lastHistory.commentDate?.split('-')[0];
        if (dateString) {
          const [day, month, year] = dateString.split('/').map(Number);
          const date = new Date(year, month - 1, day);

          if (date.getFullYear() === currentYear) {
            totalDisbursalAmountThisYear += amount;
            if (date.getMonth() === currentMonth) {
              totalDisbursalAmountThisMonth += amount;
            }
          }
        }
      }
    });

    const stats = {
      totalLeads,
      percentageUnderProcess: totalLeads > 0 ? ((underProcessCount / totalLeads) * 100).toFixed(2) : "0.00",
      percentageApproved: totalLeads > 0 ? ((approvedCount / totalLeads) * 100).toFixed(2) : "0.00",
      percentageDisbursed: totalLeads > 0 ? ((disbursedCount / totalLeads) * 100).toFixed(2) : "0.00",
      totalDisbursalAmount,
      totalDisbursalAmountThisMonth,
      totalDisbursalAmountThisYear,
    };

    return {
      data: stats,
      message: "Lead statistics retrieved successfully",
    };
  }
}

export default new LeadService();
