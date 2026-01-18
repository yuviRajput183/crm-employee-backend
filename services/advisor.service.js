import ErrorResponse from "../lib/error.res.js";
import Advisor from "../models/Advisor.model.js";
import Bank from "../models/Bank.model.js";
import City from "../models/City.model.js";
import Department from "../models/Department.model.js";
import Employee from "../models/Employee.model.js";

class AdvisorService {
  /**
   * createAdvisor - Create a new advisor.
   * @param {body(name, email, mobile, photoUrl, companyName, address, altContact, state, city, reportingOfficer, aadharNo, panNo, bankName, accountHolderName, accountNumber, ifscCode, dateOfJoining)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addAdvisor(req, res, next) {
    const {
      name,
      email,
      mobile,
      companyName,
      address,
      altContact,
      stateName,
      cityName,
      reportingOfficer,
      aadharNo,
      panNo,
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      dateOfJoining,
    } = req.body;

    const creator = await Employee.findById(req.user.referenceId);
    if (!creator) {
      return next(ErrorResponse.notFound("Creator employee not found"));
    }

    // Check for duplicate name
    const existingName = await Advisor.findOne({ name });
    if (existingName) {
      return next(ErrorResponse.badRequest("Advisor name already exists"));
    }

    // Check for duplicate mobile
    const existingMobile = await Advisor.findOne({ mobile });
    if (existingMobile) {
      return next(ErrorResponse.badRequest("Mobile number already exists"));
    }

    // (Optional) Cloudinary Upload placeholder
    // let uploadedPhotoUrl = "";
    // if (req.file) {
    //   const result = await cloudinary.v2.uploader.upload(req.file.path, {
    //     folder: "crm/advisors",
    //   });
    //   uploadedPhotoUrl = result.secure_url;
    // }

    // console.log(cityName, stateName);
    // Find the city by name + state name
    const cityDoc = await City.findOne({
      _id: cityName,
      stateName: { $regex: `^${stateName}$`, $options: "i" },
    });

    if (!cityDoc) {
      return next(
        ErrorResponse.notFound("City not found with given name and state")
      );
    }

    // Generate advisor code like DSA001, ADV002
    const latestAdvisor = await Advisor.findOne()
      .sort({ createdAt: -1 })
      .select("advisorCode");

    let advisorCode = "DSA001";
    if (latestAdvisor && latestAdvisor.advisorCode) {
      const num = parseInt(latestAdvisor.advisorCode.replace("DSA", ""));
      advisorCode = "DSA" + (num + 1).toString().padStart(3, "0");
    }

    let photoUrl = "";
    if (req.file) {
      photoUrl = req.file.filename;
    }

    const newAdvisor = new Advisor({
      name,
      email: email || "",
      mobile,
      advisorCode,
      photoUrl: photoUrl || "", // or uploadedPhotoUrl
      companyName: companyName || "",
      address: address || "",
      altContact: altContact || "",
      state: stateName,
      city: cityDoc._id,
      reportingOfficer: reportingOfficer || creator._id,
      aadharNo: aadharNo || "",
      panNo: panNo || "",
      bankName: bankName || "",
      accountHolderName: accountHolderName || "",
      accountNumber: accountNumber || "",
      ifscCode: ifscCode || "",
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),

      // Ownership
      createdBy: creator._id,
      ownerId: creator.ownerId,
      groupId: creator.groupId,

      isActivated: creator.isOwner ? true : false,
      isActive: true,
      isCredential: false,
    });

    await newAdvisor.save();

    return {
      data: newAdvisor,
      message: "Advisor created successfully",
    };
  }

  /**
   * fetchAllAdvisors - Fetch all advisors created by the current logged in user.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async fetchAllAdvisors(req, res, next) {
    const { page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const currentUserId = req.user.referenceId;

    const currentEmployee = await Employee.findById(currentUserId);
    if (!currentEmployee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    let advisors, totalCount;

    if (currentEmployee.isOwner) {
      // E1 can see all advisors in their group
      advisors = await Advisor.find({ groupId: currentEmployee.groupId })
        .select("_id name email mobile advisorCode isActive")
        .populate("reportingOfficer", "name _id")
        .skip(skip)
        .limit(parsedLimit)
        .sort({ createdAt: -1 });

      totalCount = await Advisor.countDocuments({
        groupId: currentEmployee.groupId,
      });
    } else {
      // Other admins see only advisors created by them
      advisors = await Advisor.find({ createdBy: currentUserId })
        .select("_id name email mobile advisorCode isActive")
        .populate("reportingOfficer", "name _id")
        .skip(skip)
        .limit(parsedLimit)
        .sort({ createdAt: -1 });

      totalCount = await Advisor.countDocuments({ createdBy: currentUserId });
    }

    return {
      data: {
        advisors,
        totalCount,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalCount / parsedLimit),
      },
      message: "Employees fetched successfully",
    };
  }

  /**
   * fetchSingleAdvisor - Fetches a single advisor on the basis of the advisorId.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async fetchSingleAdvisor(req, res, next) {
    const { advisorId } = req.params;
    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in employee not found"));
    }

    const advisor = await Advisor.findById(advisorId)
      .populate("reportingOfficer", "name _id")
      .populate("city", "cityName stateName _id");

    if (!advisor) {
      return next(ErrorResponse.notFound("Advisor not found"));
    }

    if (currentUser.isOwner) {
      if (advisor.groupId.toString() !== currentUser.groupId.toString()) {
        return next(
          ErrorResponse.forbidden("You can only view advisors in your group")
        );
      }
    } else {
      if (advisor.createdBy.toString() !== currentUser._id.toString()) {
        return next(
          ErrorResponse.forbidden("You are not authorized to view this advisor")
        );
      }
    }
    return {
      data: advisor,
      message: "Advisor fetched successfully",
    };
  }

  /**
   * editAdvisor - Edits an existing advisor.
   * @param {body(name, email, mobile, photoUrl, companyName, address, altContact, state, city, reportingOfficer, aadharNo, panNo, bankName, accountHolderName, accountNumber, ifscCode, dateOfJoining)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editAdvisor(req, res, next) {
    const { advisorId } = req.params;
    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const advisor = await Advisor.findById(advisorId);

    if (!advisor) {
      return next(ErrorResponse.notFound("Advisor to update not found"));
    }

    const isOwner = currentUser.isOwner;
    const isSameGroup =
      advisor.groupId.toString() === currentUser.groupId.toString();
    const isCreatedBy =
      advisor.createdBy.toString() === currentUser._id.toString();

    if (!isOwner && !isSameGroup) {
      return next(
        ErrorResponse.forbidden("You can only edit advisors in your group")
      );
    }

    if (!isOwner && !isCreatedBy) {
      return next(
        ErrorResponse.forbidden("You are not authorized to edit this advisor")
      );
    }

    const {
      name,
      mobile,
      email,
      companyName,
      address,
      altContact,
      stateName,
      cityName,
      reportingOfficer,
      aadharNo,
      panNo,
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      dateOfJoining,
      dateOfResign,
    } = req.body;

    // Check for duplicate mobile (if updated)
    if (mobile && mobile !== advisor.mobile) {
      const existingMobile = await Advisor.findOne({ mobile });
      if (existingMobile && existingMobile._id.toString() !== advisorId) {
        return next(ErrorResponse.badRequest("Mobile number already in use"));
      }
    }

    // Check for duplicate name (if updated)
    if (name && name !== advisor.name) {
      const existingName = await Advisor.findOne({ name });
      if (existingName && existingName._id.toString() !== advisorId) {
        return next(ErrorResponse.badRequest("Advisor name already exists"));
      }
    }

    let photoUrl = "";
    if (req.file) {
      photoUrl = req.file.filename; // Access multer uploaded file
    }

    advisor.name = name || advisor.name;
    advisor.mobile = mobile || advisor.mobile;
    advisor.email = email || advisor.email;
    advisor.email = email || advisor.email;
    if (req.body.isPhotoRemoved === "true" || req.body.isPhotoRemoved === true) {
      advisor.photoUrl = "";
    } else {
      advisor.photoUrl = photoUrl || advisor.photoUrl;
    }
    advisor.companyName = companyName || advisor.companyName;
    advisor.companyName = companyName || advisor.companyName;
    advisor.address = address || advisor.address;
    advisor.altContact = altContact || advisor.altContact;
    advisor.state = stateName || advisor.state;
    advisor.city = cityName || advisor.city;
    advisor.reportingOfficer = reportingOfficer || advisor.reportingOfficer;
    advisor.aadharNo = aadharNo || advisor.aadharNo;
    advisor.panNo = panNo || advisor.panNo;
    advisor.bankName = bankName || advisor.bankName;
    advisor.accountHolderName = accountHolderName || advisor.accountHolderName;
    advisor.accountNumber = accountNumber || advisor.accountNumber;
    advisor.ifscCode = ifscCode || advisor.ifscCode;
    advisor.dateOfJoining = dateOfJoining || advisor.dateOfJoining;
    advisor.dateOfResign = dateOfResign || null;

    advisor.isActive = dateOfResign ? false : true;

    await advisor.save();

    return {
      message: "Advisor updated successfully",
      data: advisor,
    };
  }

  /**
   * getAdvisorsWithoutCredentials - Fetch all advisors name which are created but there login credentials are not set.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAdvisorsWithoutCredentials(req, res, next) {
    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in employee not found"));
    }

    let advisors;

    if (currentUser.isOwner) {
      // Super Admin can see all advisors of the group without credentials
      advisors = await Advisor.find({
        groupId: currentUser.groupId,
        isCredential: false,
        isActive: true
      }).select("_id name");
    } else {
      // Normal Admin can see only advisors created by them
      advisors = await Advisor.find({
        createdBy: currentUserId,
        isCredential: false,
        isActive: true
      }).select("_id name");
    }

    return {
      data: advisors,
      message: "Advisors without credentials fetched successfully",
    };
  }

  /**
   * getAdvisorsForDropdown - Fetch all advisors for the dropdown on the basis of the logged in user.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async getAdvisorsForDropdown(req, res, next) {
    const user = await Employee.findById(req.user.referenceId);
    if (!user) return next(ErrorResponse.notFound("User not found"));

    let advisors = [];

    if (user.isOwner) {
      // Super Admin: get all advisors of the group
      advisors = await Advisor.find({ groupId: user._id, isActive: true }).select("name _id");
    } else {
      const department = await Department.findById(user.department).select(
        "name"
      );
      if (!department)
        return next(ErrorResponse.notFound("Department not found"));

      const isAdmin = department.name.toLowerCase().includes("admin");

      if (isAdmin) {
        // Admin: get advisors created by him
        advisors = await Advisor.find({ createdBy: user._id, isActive: true }).select(
          "name _id"
        );
      } else {
        // Normal Employee: Get all the advisors whose reporting officer is same as reporting officer of the logged in employee.

        advisors = await Advisor.find({ reportingOfficer: user.reportingOfficer, isActive: true }).select("name _id");
      }
    }

    if (advisors.length === 0) {
      return {
        data: [],
        message: "No advisors found",
      }
    };

    return {
      data: advisors,
      message: "Advisors fetched successfully",
    };

  }
}

export default new AdvisorService();
