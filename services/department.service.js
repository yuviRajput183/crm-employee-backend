import ErrorResponse from "../lib/error.res.js";
import Department from "../models/Department.model.js";
import Employee from "../models/Employee.model.js";

class DepartmentService {
  /**
   * addDepartment - Add a new department name.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async addDepartment(req, res, next) {
    const { name } = req.body;

    const createdBy = req.user.referenceId;
    const groupId = req.user.groupId;

    if (!name || name.trim() === "") {
      return next(ErrorResponse.badRequest("Department name is required"));
    }

    const cleanName = name.trim();

    const exist = await Department.findOne({
      name: { $regex: `^${cleanName}$`, $options: "i" },
    });
    if (exist) {
      return next(ErrorResponse.badRequest("Department already exists"));
    }

    const department = await Department.create({
      name: cleanName,
      createdBy,
      groupId,
    });

    return {
      data: department,
      message: "Department added successfully",
    };
  }

  /**
   * listDepartments - List all departments and designations.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async listDepartments(req, res, next) {
    const loginUserId = req.user.referenceId;

    const currentUser = await Employee.findById(loginUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in employee not found"));
    }

    const departments = await Department.find({
      groupId: currentUser.groupId,
    }).sort({ createdAt: -1 });

    return {
      data: departments,
      message: "Departments fetched successfully",
    };
  }

  /**
   * editDepartment - Edit a department name.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async editDepartment(req, res, next) {
    const { name, departmentId } = req.body;
    const loggedInUserId = req.user.referenceId;

    const cleanName = name.trim();

    const department = await Department.findById(departmentId);
    if (!department) {
      return next(ErrorResponse.notFound("Department not found"));
    }

    // Don't allow editing of default/system departments
    if (department.isDefault) {
      return next(
        ErrorResponse.forbidden("Default department cannot be edited")
      );
    }

    if (department.createdBy.toString() !== loggedInUserId.toString()) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to edit this department"
        )
      );
    }

    // Check if a different department already has this name (case-insensitive)
    const existing = await Department.findOne({
      name: { $regex: `^${cleanName}$`, $options: "i" },
      _id: { $ne: departmentId },
    });

    if (existing) {
      return next(
        ErrorResponse.badRequest(
          "Another department with this name already exists"
        )
      );
    }
    department.name = cleanName;

    await department.save();
    return {
      data: department,
      message: "Department name updated successfully",
    };
  }

  /**
   * addDesignationToDepartment - Add a designation to a department.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async addDesignationToDepartment(req, res, next) {
    const { departmentId, designation } = req.body;
    const department = await Department.findById(departmentId);
    if (!department) {
      return next(ErrorResponse.notFound("Department not found"));
    }

    // Authorization check
    if (department.createdBy.toString() !== req.user.referenceId.toString()) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to modify this department"
        )
      );
    }

    const cleanedDesignation = designation.trim();
    const alreadyExists = department.designations.some(
      (d) => d.toLowerCase() === cleanedDesignation.toLowerCase()
    );

    if (alreadyExists) {
      return next(
        ErrorResponse.badRequest(
          "Designation already exists in this department"
        )
      );
    }

    department.designations.push(cleanedDesignation);
    await department.save();

    return {
      data: department,
      message: "Designation added successfully",
    };
  }

  /**
   * getDesignationsByDepartment - Get all designations in a department on the basis of department id.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async getDesignationsByDepartment(req, res, next) {
    const { departmentId } = req.query;

    const department = await Department.findById(departmentId).select(
      "name designations"
    );
    if (!department) {
      return next(ErrorResponse.notFound("Department not found"));
    }
    return {
      data: {
        departmentName: department.name,
        designations: department.designations,
      },
      message: "Designations fetched successfully",
    };
  }

  /**
   * editDesignationInDepartment - Edit a designation in a department on the basis of department id and old designation.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async editDesignationInDepartment(req, res, next) {
    const { oldDesignation, newDesignation, departmentId } = req.body;
    const loggedInUserId = req.user.referenceId;

    const department = await Department.findById(departmentId);
    if (!department) {
      return next(ErrorResponse.notFound("Department not found"));
    }

    // Authorization: only allow if department is created by this user
    if (department.createdBy?.toString() !== loggedInUserId.toString()) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to edit this designation"
        )
      );
    }

    const cleanOld = oldDesignation.trim();
    const cleanNew = newDesignation.trim();

    const index = department.designations.indexOf(cleanOld);
    if (index === -1) {
      return next(
        ErrorResponse.badRequest("Designation not found in this department")
      );
    }

    // Preventing duplicate designation
    if (department.designations.includes(cleanNew)) {
      return next(
        ErrorResponse.badRequest(
          "Another designation with this name already exists in this department"
        )
      );
    }

    // Update designation
    department.designations[index] = cleanNew;
    await department.save();

      // Update designation in all related employees
  await Employee.updateMany(
    {
      department: department._id,
      designation: cleanOld,
    },
    {
      $set: { designation: cleanNew },
    }
  );
    return {
      data: department,
      message: "Designation updated successfully",
    };
  }
}

export default new DepartmentService();
