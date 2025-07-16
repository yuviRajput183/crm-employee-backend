import ErrorResponse from "../lib/error.res.js";
import Bank from "../models/Bank.model.js";
import Employee from "../models/Employee.model.js";

class BankService {
    /**
     * addBank - Admin can add a new bank name.
     * @param {body(name)} req - The request body.
     * @param {Object} res - The HTTP response object.
     * @param {Function} next - The next middleware function.
     */
    async addBank(req, res, next) {
        const { name } = req.body;
        const userId = req.user.referenceId;

        const currentUser = await Employee.findById(userId).select("groupId");
        if(!currentUser) {
            return next(ErrorResponse.notFound("Logged-in user not found"));
        }

        const exists = await Bank.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
        if(exists) {
            return next(ErrorResponse.badRequest("Bank already exists"));
        }

        const bank = await Bank.create({
            name,
            createdBy: currentUser.groupId
        })

        return {
            data: bank,
            message: "Bank added successfully"
        }
    }

    /**
     * listBanks - List all banks which are created by the admin of the group.
     * @param {Object} req - The HTTP request object.
     * @param {Object} res - The HTTP response object.
     * @param {Function} next - The next middleware function.
     */
    async listBanks(req, res, next) {
        const userId = req.user.referenceId;

        const currentUser = await Employee.findById(userId).select("groupId");
        if(!currentUser) {
            return next(ErrorResponse.notFound("Logged-in user not found"));
        }

        const banks = await Bank.find({
            createdBy: currentUser.groupId
        }).sort({
            name: 1
        });
        return {
            data: banks,
            message: banks.length > 0 ? "Banks fetched successfully" : "No banks found",
        }
    }

    /**
     * editBank - Admin can edit the name of the bank.
     * @param {body(bankId, name)} req - The request body.
     * @param {Object} res - The HTTP response object.
     * @param {Function} next - The next middleware function.
     */
    async editBank(req, res, next) {
        const { bankId, name } = req.body;
        const currentUserId = req.user.referenceId;

        const currentUser = await Employee.findById(currentUserId).select("groupId");
        if(!currentUser) {
            return next(ErrorResponse.notFound("Employee not found"));
        }

        const bank = await Bank.findOne({
            _id: bankId,
            createdBy: currentUser.groupId
        })

        if(!bank) {
            return next(ErrorResponse.notFound("Bank not found or access denied"));
        }

        bank.name = name.trim();
        await bank.save();

        return {
            data: bank,
            message: "Bank name updated successfully"
        }
    }

}

export default new BankService();