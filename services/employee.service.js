import ErrorResponse from "../lib/error.res.js";
import Department from "../models/Department.model.js";
import Employee from "../models/Employee.model.js";
// import License from "../models/License.model.js";
import User from "../models/User.model.js";
// import cloudinary from "cloudinary";

class EmployeeService {
  /**
   * createGroupSuperAdmin - Create a new super admin user.
   * @param {body(name, email, mobile, username, password, totalEmployees, totalAdvisors)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async createGroupSuperAdmin(req, res, next) {
    try {
      const {
        name,
        email,
        mobile,
        username,
        password,
        // totalEmployees,
        // totalAdvisors,
        // licenseKey,
      } = req.body;

      if (
        !name ||
        !email ||
        !mobile ||
        !username ||
        !password
        // !totalEmployees ||
        // !totalAdvisors
        // || !licenseKey
      ) {
        return next(
          ErrorResponse.badRequest("All required fields must be provided")
        );
      }

      // Prevent duplicate Super Admin creation
      const existingOwner = await Employee.findOne({ isOwner: true });
      if (existingOwner) {
        return next(ErrorResponse.badRequest("Super Admin already exists"));
      }

      const existingUser = await User.findOne({
        loginName: username,
      });
      if (existingUser) {
        return next(ErrorResponse.badRequest("Username already exists"));
      }

      const superAdmin = new Employee({
        name,
        email,
        mobile,
        address: "",
        altContact: "",
        photoUrl: "",
        department: null,
        designation: "administrator",
        dateOfJoining: new Date(),
        role: "admin",
        isOwner: true,
        isCredential: true,
        reportingOfficer: null, // No one above super admin
        createdBy: null,
        ownerId: null,
        groupId: null,
      });

      superAdmin.createdBy = superAdmin._id;
      superAdmin.ownerId = superAdmin._id;
      superAdmin.groupId = superAdmin._id;
      superAdmin.reportingOfficer = superAdmin._id;

      await superAdmin.save();

      // Step: Create Admin Department
      const adminDepartment = await Department.create({
        name: "Admin Department",
        designations: ["administrator"],
        createdBy: superAdmin._id,
        groupId: superAdmin._id,
        isDefault: true,
      });

      // Update Super Admin with department ID
      superAdmin.department = adminDepartment._id;
      await superAdmin.save();

      const user = new User({
        loginName: username,
        password,
        role: "employee",
        referenceId: superAdmin._id,
        createdBy: superAdmin._id,
      });
      await user.save();

      // const license = new License({
      //   licenseKey,
      //   totalEmployees,
      //   totalAdvisors,
      //   usedEmployees: 1,
      //   usedAdvisors: 0,
      //   ownerId: superAdmin._id,
      // });
      // await license.save();

      return {
        data: {
          superAdmin,
          user,
          department: adminDepartment,
          // license,
        },
        message: "Group Super Admin created successfully",
      };
    } catch (error) {
      return next(ErrorResponse.internalServer(error.message));
    }
  }

  /**
   * createEmployee - Create a new employee.
   * @param {body(name, email, mobile, department, designation, reportingOfficer, dateOfJoining, address, altContact)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async createEmployee(req, res, next) {
    const {
      name,
      mobile,
      email,
      department,
      designation,
      reportingOfficer,
      dateOfJoining,
      address,
      altContact,
    } = req.body;

    const creator = await Employee.findById(req.user.referenceId);
    if (!creator) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    // const license = await License.findOne({
    //   ownerId: creator.ownerId,
    // });
    // if (!license || license.usedEmployees >= license.totalEmployees) {
    //   return next(ErrorResponse.forbidden("Employee License limit reached"));
    // }

    // Upload photo to cloudinary if provided(future work)
    // let photoUrl = "";
    // if (req.file) {
    //   const result = await cloudinary.v2.uploader.upload(req.file.path, {
    //     folder: "crm/employees",
    //     width: 150,
    //     height: 150,
    //     crop: "fill",
    //   });
    //   photoUrl = result.secure_url;
    // }

    const departmentDoc = await Department.findById(department);
    if (!departmentDoc) {
      return next(ErrorResponse.notFound("Department not found"));
    }

    const isAdminDepartment = departmentDoc.name
      .toLowerCase()
      .includes("admin department");

    // Admins can't create users in Admin Department
    if (!creator.isOwner && isAdminDepartment) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to assign Admin Department"
        )
      );
    }

    const isActive = true;

    // const existingEmployee = await Employee.findOne({ name });
    // if (existingEmployee) {
    //   return next(
    //     ErrorResponse.badRequest(
    //       "Employee name already exists. Please choose a unique name."
    //     )
    //   );
    // }

    const existingMobile = await Employee.findOne({ mobile });
    if (existingMobile) {
      return next(
        ErrorResponse.badRequest(
          "Mobile number already exists. Please use a different number."
        )
      );
    }
    const assignedReportingOfficer = reportingOfficer || creator._id;

    let photoUrl = "";
    if (req.file) {
      photoUrl = req.file.filename;
    }

    const newEmployee = new Employee({
      name,
      email: email || "",
      mobile,
      department: departmentDoc._id,
      designation,
      reportingOfficer: assignedReportingOfficer,
      dateOfJoining: new Date(dateOfJoining),
      address: address || "",
      altContact: altContact || "",
      photoUrl,
      isActive,
      isCredential: false,
      isActivated: creator.isOwner ? true : false,
      role: isAdminDepartment ? "admin" : "employee",
      isOwner: false,
      createdBy: creator._id,
      ownerId: creator.ownerId,
      groupId: creator.groupId,
    });

    await newEmployee.save();

    // license.usedEmployees += 1;
    // await license.save();

    return {
      data: {
        newEmployee,
        // license,
      },
      message: "Employee created successfully",
    };
  }

  /**
   * fetchAllEmployees - Fetch all employees created by the current logged in user.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async fetchAllEmployees(req, res, next) {
    const { page = 1, limit = 100 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const currentUserId = req.user.referenceId;

    const currentEmployee = await Employee.findById(currentUserId);
    if (!currentEmployee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    let employees, totalCount;

    if (currentEmployee.isOwner) {
      // E1 can see all employees in their group
      employees = await Employee.find({ groupId: currentEmployee.groupId })
        .select("_id name email mobile designation isActive department dateOfJoining dateOfResign")
        .populate("department", "_id name")
        .populate("reportingOfficer", "_id name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      totalCount = await Employee.countDocuments({
        groupId: currentEmployee.groupId,
      });
    } else {
      // Other admins see only employees created by them
      employees = await Employee.find({ createdBy: currentUserId })
        .select("_id name email mobile designation isActive department dateOfJoining dateOfResign")
        .populate("department", "_id name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      totalCount = await Employee.countDocuments({ createdBy: currentUserId });
    }

    return {
      data: {
        employees,
        totalCount,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalCount / parsedLimit),
      },
      message: "Employees fetched successfully",
    };
  }

  /**
   * fetchSingleEmployee - Fetches a single employee on the basis of the employeeId.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async fetchSingleEmployee(req, res, next) {
    const { employeeId } = req.params;
    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const employee = await Employee.findById(employeeId)
      .populate("department", "name")
      .populate("reportingOfficer", "name")
      .lean();

    if (!employee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const isOwner = currentUser.isOwner;
    const isSameGroup =
      employee.groupId.toString() === currentUser.groupId.toString();
    const isCreatedBy =
      employee.createdBy.toString() === currentUser._id.toString();

    if (!isOwner && !isSameGroup) {
      return next(
        ErrorResponse.forbidden("You can only view employees in your group")
      );
    }

    if (!isOwner && !isCreatedBy) {
      return next(
        ErrorResponse.forbidden("You are not authorized to view this employee")
      );
    }

    return {
      data: employee,
      message: "Employee fetched successfully",
    };
  }

  /**
   * editEmployee - Edits an existing employee.
   * @param {body(name, email, mobile, address, altContact, department, designation, reportingOfficer, dateOfJoining, dateOfResign)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editEmployee(req, res, next) {
    const { employeeId } = req.params;
    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in employee not found"));
    }

    const employeeToUpdate = await Employee.findById(employeeId);

    if (!employeeToUpdate) {
      return next(ErrorResponse.notFound("Employee to update not found"));
    }

    // Authorization check
    if (
      currentUser.isOwner === false &&
      employeeToUpdate.createdBy.toString() !== currentUserId
    ) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to update this employee"
        )
      );
    }

    // Owner can only update employees from their group
    if (
      currentUser.isOwner === true &&
      employeeToUpdate.groupId.toString() !== currentUser.groupId.toString()
    ) {
      return next(
        ErrorResponse.forbidden("You can only update employees from your group")
      );
    }

    const {
      name,
      email,
      mobile,
      address,
      altContact,
      department,
      designation,
      reportingOfficer,
      dateOfJoining,
      dateOfResign,
    } = req.body;

    // Check if new name exists in another employee
    // if (name && name !== employeeToUpdate.name) {
    //   const existingName = await Employee.findOne({ name });
    //   if (existingName && existingName._id.toString() !== employeeId) {
    //     return next(
    //       ErrorResponse.badRequest(
    //         "Employee name already exists. Please choose a unique name."
    //       )
    //     );
    //   }
    // }

    // Check if new mobile exists in another employee
    if (mobile && mobile !== employeeToUpdate.mobile) {
      const existingMobile = await Employee.findOne({ mobile });
      if (existingMobile && existingMobile._id.toString() !== employeeId) {
        return next(
          ErrorResponse.badRequest(
            "Mobile number already exists. Please use a different number."
          )
        );
      }
    }

    // Validate department if changed
    if (
      department &&
      department.toString() !== employeeToUpdate.department.toString()
    ) {
      const departmentDoc = await Department.findById(department);
      if (!departmentDoc) {
        return next(ErrorResponse.notFound("Department not found"));
      }
      employeeToUpdate.department = department;
    }

    // Validate reporting officer if changed
    if (
      reportingOfficer &&
      reportingOfficer.toString() !==
        employeeToUpdate.reportingOfficer?.toString()
    ) {
      const officerExists = await Employee.findById(reportingOfficer);
      if (!officerExists) {
        return next(ErrorResponse.notFound("Reporting officer not found"));
      }
      employeeToUpdate.reportingOfficer = reportingOfficer;
    }

    let photoUrl = "";
    if (req.file) {
      photoUrl = req.file.filename; // Access multer uploaded file
    }

    // Update fields
    employeeToUpdate.name = name || employeeToUpdate.name;
    employeeToUpdate.email = email || employeeToUpdate.email;
    employeeToUpdate.mobile = mobile || employeeToUpdate.mobile;
    employeeToUpdate.address = address || employeeToUpdate.address;
    employeeToUpdate.altContact = altContact || employeeToUpdate.altContact;
    employeeToUpdate.photoUrl = photoUrl || employeeToUpdate.photoUrl;
    employeeToUpdate.designation = designation || employeeToUpdate.designation;
    employeeToUpdate.dateOfJoining =
      dateOfJoining || employeeToUpdate.dateOfJoining;
    employeeToUpdate.dateOfResign = dateOfResign || null;

    // if resign date is set, mark inactive
    employeeToUpdate.isActive = dateOfResign ? false : true;

    await employeeToUpdate.save();

    const updatedEmployee = await Employee.findById(employeeToUpdate._id)
      .populate("department", "_id name")
      .populate("reportingOfficer", "_id name");

    return {
      data: updatedEmployee,
      message: "Employee updated successfully",
    };
  }

  /**
   * getEmployeesWithoutCredentials - Fetch all employees name which are created but there login credentials are not set.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getEmployeesWithoutCredentials(req, res, next) {
    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    let employees;

    if (currentUser.isOwner) {
      // Super Admin: Fetch all without credentials
      employees = await Employee.find({ isCredential: false, isActive: true }).select(
        "_id name"
      );
    } else {
      // Admin: Fetch only those created by this admin
      employees = await Employee.find({
        isCredential: false,
        createdBy: currentUserId,
        isActive: true
      }).select("_id name");
    }

    return {
      data: employees,
      message: "Employees fetched successfully",
    };
  }

  /**
   * getReportingOfficer - Fetches the all admin of the group because they can be the reporting officer of the employee and advisor.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getReportingOfficer(req, res, next) {
    const currentEmployee = await Employee.findById(req.user.referenceId);
    if (!currentEmployee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    let reportingOfficers = [];

    if (currentEmployee.isOwner) {
      reportingOfficers = await Employee.find({
        groupId: currentEmployee.groupId,
        role: { $regex: /^admin$/i },
        isActive: true,
      })
        .select("_id name")
        .lean();
    } else {
      reportingOfficers = [
        {
          _id: currentEmployee._id,
          name: currentEmployee.name,
        },
      ];
    }

    return {
      data: reportingOfficers,
      message: "Reporting officers fetched successfully",
    };
  }

  /**
   * getNonAdminEmployees - Fetch all employees name which are not belongs to admin department.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getNonAdminEmployees(req, res, next) {
    const currentEmployee = await Employee.findById(req.user.referenceId);

    if(!currentEmployee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    let employees = [];

    if(currentEmployee.role.toLowerCase() === "admin" && currentEmployee.isOwner) {
      // Super Admin - see all non-admin employees in their group
      employees = await Employee.find({
        role: "employee",
        groupId: currentEmployee.groupId,
        isActive: true
      })
        .select("_id name")
        .lean();
    } else if (currentEmployee.role.toLowerCase() === "admin" && !currentEmployee.isOwner) {
      // Admin - see only employees created by this admin
      employees = await Employee.find({
        role: "employee",
        createdBy: currentEmployee._id,
        isActive: true
      })
        .select("_id name")
        .lean();
    } else {
      return next(ErrorResponse.unauthorized("Access denied"));
    }

    return {
      data: employees,
      message: "Employees fetched successfully",
    }
  }
}

export default new EmployeeService();
