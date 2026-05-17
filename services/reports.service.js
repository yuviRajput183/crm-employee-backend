import Invoice from "../models/Invoices.model.js";
import AdvisorPayout from "../models/AdvisorPayout.model.js";

class ReportService {
    async getReceivablesReport(req, res, next) {
        let { loanType, advisorName, status, fromDate, toDate, page = 1, limit = 1000 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const matchStage = {};
        if (fromDate || toDate) {
            matchStage.invoiceDate = {};
            if (fromDate) matchStage.invoiceDate.$gte = new Date(fromDate);
            if (toDate) matchStage.invoiceDate.$lte = new Date(toDate);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "leads",
                    localField: "leadId",
                    foreignField: "_id",
                    as: "lead"
                }
            },
            { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "advisors",
                    localField: "lead.advisorId",
                    foreignField: "_id",
                    as: "advisor"
                }
            },
            { $unwind: { path: "$advisor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "bankers",
                    localField: "lead.bankerId",
                    foreignField: "_id",
                    as: "banker"
                }
            },
            { $unwind: { path: "$banker", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "banks",
                    localField: "banker.bank",
                    foreignField: "_id",
                    as: "bank"
                }
            },
            { $unwind: { path: "$bank", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "invoicemasters",
                    localField: "invoiceMasterId",
                    foreignField: "_id",
                    as: "invoiceMaster"
                }
            },
            { $unwind: { path: "$invoiceMaster", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "processedbies",
                    localField: "processedById",
                    foreignField: "_id",
                    as: "processedBy"
                }
            },
            { $unwind: { path: "$processedBy", preserveNullAndEmptyArrays: true } }
        ];

        // Apply filters
        const filterStage = {};
        if (loanType) {
            filterStage["lead.productType"] = { $regex: new RegExp(loanType, "i") };
        }
        if (advisorName) {
            filterStage["advisor.name"] = { $regex: new RegExp(advisorName, "i") };
        }
        if (Object.keys(filterStage).length > 0) {
            pipeline.push({ $match: filterStage });
        }

        pipeline.push({
            $project: {
                leadNo: "$lead.leadNo",
                disbursalDate: "$disbursalDate",
                clientName: "$lead.clientName",
                product: "$lead.productType",
                disbursalAmt: "$disbursalAmount",
                advisor: "$advisor.name",
                bank: "$bank.name",
                banker: "$banker.bankerName",
                invoiceNo: "$invoiceNo",
                invoiceDate: "$invoiceDate",
                billingPercentage: "$payoutPercent",
                billAmt: "$payoutAmount",
                tdsPercentage: "$tdsPercent",
                tdsAmt: "$tdsAmount",
                netDueAmt: { $subtract: ["$payoutAmount", "$tdsAmount"] },
                receivedAmt: {
                   $cond: {
                      if: { $gt: ["$invoiceMaster.invoiceReceivableAmount", 0] },
                      then: { $subtract: ["$invoiceMaster.invoiceReceivableAmount", "$invoiceMaster.remainingReceivableAmount"] },
                      else: 0
                   }
                },
                processedBy: "$processedBy.processedBy",
                pendingAmt: "$invoiceMaster.remainingReceivableAmount",
                status: {
                    $cond: {
                        if: { $lte: ["$invoiceMaster.remainingReceivableAmount", 0] },
                        then: "Received",
                        else: "Pending"
                    }
                }
            }
        });

        if (status) {
            pipeline.push({
                $match: {
                    status: { $regex: new RegExp(status, "i") }
                }
            });
        }

        pipeline.push({ $sort: { leadNo: -1, invoiceDate: -1 } });
        
        const in_db = await Invoice.aggregate(pipeline);
        const paginatedData = in_db.slice((page - 1) * limit, page * limit);
        
        const totals = in_db.reduce((acc, curr) => {
            acc.disbursalAmt += (curr.disbursalAmt || 0);
            acc.billAmt += (curr.billAmt || 0);
            acc.tdsAmt += (curr.tdsAmt || 0);
            acc.netDueAmt += (curr.netDueAmt || 0);
            acc.receivedAmt += (curr.receivedAmt || 0);
            acc.pendingAmt += (curr.pendingAmt || 0);
            return acc;
        }, { disbursalAmt: 0, billAmt: 0, tdsAmt: 0, netDueAmt: 0, receivedAmt: 0, pendingAmt: 0 });

        return {
            totalData: in_db.length,
            totalPages: Math.ceil(in_db.length / limit),
            currentPage: page,
            totals: totals,
            data: paginatedData
        };
    }
    async getGSTReceivablesReport(req, res, next) {
        let { loanType, advisorName, status, fromDate, toDate, page = 1, limit = 1000 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const matchStage = {};
        if (fromDate || toDate) {
            matchStage.invoiceDate = {};
            if (fromDate) matchStage.invoiceDate.$gte = new Date(fromDate);
            if (toDate) matchStage.invoiceDate.$lte = new Date(toDate);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "leads",
                    localField: "leadId",
                    foreignField: "_id",
                    as: "lead"
                }
            },
            { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "advisors",
                    localField: "lead.advisorId",
                    foreignField: "_id",
                    as: "advisor"
                }
            },
            { $unwind: { path: "$advisor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "bankers",
                    localField: "lead.bankerId",
                    foreignField: "_id",
                    as: "banker"
                }
            },
            { $unwind: { path: "$banker", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "banks",
                    localField: "banker.bank",
                    foreignField: "_id",
                    as: "bank"
                }
            },
            { $unwind: { path: "$bank", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "invoicemasters",
                    localField: "invoiceMasterId",
                    foreignField: "_id",
                    as: "invoiceMaster"
                }
            },
            { $unwind: { path: "$invoiceMaster", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "processedbies",
                    localField: "processedById",
                    foreignField: "_id",
                    as: "processedBy"
                }
            },
            { $unwind: { path: "$processedBy", preserveNullAndEmptyArrays: true } }
        ];

        // Apply filters
        const filterStage = {};
        if (loanType) {
            filterStage["lead.productType"] = { $regex: new RegExp(loanType, "i") };
        }
        if (advisorName) {
            filterStage["advisor.name"] = { $regex: new RegExp(advisorName, "i") };
        }
        if (Object.keys(filterStage).length > 0) {
            pipeline.push({ $match: filterStage });
        }

        pipeline.push({
            $project: {
                leadNo: "$lead.leadNo",
                disbursalDate: "$disbursalDate",
                clientName: "$lead.clientName",
                product: "$lead.productType",
                advisor: "$advisor.name",
                bank: "$bank.name",
                banker: "$banker.bankerName",
                invoiceNo: "$invoiceNo",
                invoiceDate: "$invoiceDate",
                billAmt: "$payoutAmount",
                gstPercentage: "$gstPercent",
                gstAmt: "$gstAmount",
                receivedAmt: {
                   $cond: {
                      if: { $gt: ["$invoiceMaster.invoiceGstAmount", 0] },
                      then: { $subtract: ["$invoiceMaster.invoiceGstAmount", "$invoiceMaster.remainingGstAmount"] },
                      else: 0
                   }
                },
                processedBy: "$processedBy.processedBy",
                pendingAmt: "$invoiceMaster.remainingGstAmount",
                status: {
                    $cond: {
                        if: { $lte: ["$invoiceMaster.remainingGstAmount", 0] },
                        then: "Received",
                        else: "Pending"
                    }
                }
            }
        });

        if (status) {
            pipeline.push({
                $match: {
                    status: { $regex: new RegExp(status, "i") }
                }
            });
        }

        pipeline.push({ $sort: { leadNo: -1, invoiceDate: -1 } });
        
        const in_db = await Invoice.aggregate(pipeline);
        const paginatedData = in_db.slice((page - 1) * limit, page * limit);
        
        const totals = in_db.reduce((acc, curr) => {
            acc.billAmt += (curr.billAmt || 0);
            acc.gstAmt += (curr.gstAmt || 0);
            acc.receivedAmt += (curr.receivedAmt || 0);
            acc.pendingAmt += (curr.pendingAmt || 0);
            return acc;
        }, { billAmt: 0, gstAmt: 0, receivedAmt: 0, pendingAmt: 0 });

        return {
            totalData: in_db.length,
            totalPages: Math.ceil(in_db.length / limit),
            currentPage: page,
            totals: totals,
            data: paginatedData
        };
    }
    async getPayablesReport(req, res, next) {
        let { loanType, advisorName, status, fromDate, toDate, page = 1, limit = 1000 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const matchStage = {};
        if (fromDate || toDate) {
            matchStage.invoiceDate = {};
            if (fromDate) matchStage.invoiceDate.$gte = new Date(fromDate);
            if (toDate) matchStage.invoiceDate.$lte = new Date(toDate);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "leads",
                    localField: "leadId",
                    foreignField: "_id",
                    as: "lead"
                }
            },
            { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "advisors",
                    localField: "advisorId",
                    foreignField: "_id",
                    as: "advisor"
                }
            },
            { $unwind: { path: "$advisor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "bankers",
                    localField: "lead.bankerId",
                    foreignField: "_id",
                    as: "banker"
                }
            },
            { $unwind: { path: "$banker", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "banks",
                    localField: "banker.bank",
                    foreignField: "_id",
                    as: "bank"
                }
            },
            { $unwind: { path: "$bank", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "processedbies",
                    localField: "processedById",
                    foreignField: "_id",
                    as: "processedBy"
                }
            },
            { $unwind: { path: "$processedBy", preserveNullAndEmptyArrays: true } }
        ];

        // Apply filters
        const filterStage = {};
        if (loanType) {
            filterStage["lead.productType"] = { $regex: new RegExp(loanType, "i") };
        }
        if (advisorName) {
            filterStage["advisor.name"] = { $regex: new RegExp(advisorName, "i") };
        }
        if (Object.keys(filterStage).length > 0) {
            pipeline.push({ $match: filterStage });
        }

        pipeline.push({
            $project: {
                leadNo: "$lead.leadNo",
                disbursalDate: "$disbursalDate",
                clientName: "$lead.clientName",
                product: "$lead.productType",
                disbursalAmt: "$disbursalAmount",
                advisor: "$advisor.name",
                bank: "$bank.name",
                banker: "$banker.bankerName",
                gstStatus: {
                    $cond: {
                        if: { $eq: ["$gstApplicable", true] },
                        then: "Applicable",
                        else: "Not Applicable"
                    }
                },
                invoiceNo: "$invoiceNo",
                invoiceDate: "$invoiceDate",
                billingPercentage: "$payoutPercent",
                billAmt: "$payoutAmount",
                tdsPercentage: "$tdsPercent",
                tdsAmt: "$tdsAmount",
                netDueAmt: "$netPayableAmount",
                paidAmt: {
                   $cond: {
                      if: { $gt: ["$netPayableAmount", 0] },
                      then: { $subtract: ["$netPayableAmount", "$remainingPayableAmount"] },
                      else: 0
                   }
                },
                processedBy: "$processedBy.processedBy",
                pendingAmt: "$remainingPayableAmount",
                status: {
                    $cond: {
                        if: { $lte: ["$remainingPayableAmount", 0] },
                        then: "Paid",
                        else: "Pending"
                    }
                }
            }
        });

        if (status) {
            pipeline.push({
                $match: {
                    status: { $regex: new RegExp(status, "i") }
                }
            });
        }

        pipeline.push({ $sort: { leadNo: -1, invoiceDate: -1 } });
        
        const in_db = await AdvisorPayout.aggregate(pipeline);
        const paginatedData = in_db.slice((page - 1) * limit, page * limit);
        
        const totals = in_db.reduce((acc, curr) => {
            acc.disbursalAmt += (curr.disbursalAmt || 0);
            acc.billAmt += (curr.billAmt || 0);
            acc.tdsAmt += (curr.tdsAmt || 0);
            acc.netDueAmt += (curr.netDueAmt || 0);
            acc.paidAmt += (curr.paidAmt || 0);
            acc.pendingAmt += (curr.pendingAmt || 0);
            return acc;
        }, { disbursalAmt: 0, billAmt: 0, tdsAmt: 0, netDueAmt: 0, paidAmt: 0, pendingAmt: 0 });

        return {
            totalData: in_db.length,
            totalPages: Math.ceil(in_db.length / limit),
            currentPage: page,
            totals: totals,
            data: paginatedData
        };
    }
    async getGSTPayablesReport(req, res, next) {
        let { loanType, advisorName, status, fromDate, toDate, page = 1, limit = 1000 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const matchStage = { gstApplicable: true };
        if (fromDate || toDate) {
            matchStage.invoiceDate = {};
            if (fromDate) matchStage.invoiceDate.$gte = new Date(fromDate);
            if (toDate) matchStage.invoiceDate.$lte = new Date(toDate);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "leads",
                    localField: "leadId",
                    foreignField: "_id",
                    as: "lead"
                }
            },
            { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "advisors",
                    localField: "advisorId",
                    foreignField: "_id",
                    as: "advisor"
                }
            },
            { $unwind: { path: "$advisor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "bankers",
                    localField: "lead.bankerId",
                    foreignField: "_id",
                    as: "banker"
                }
            },
            { $unwind: { path: "$banker", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "banks",
                    localField: "banker.bank",
                    foreignField: "_id",
                    as: "bank"
                }
            },
            { $unwind: { path: "$bank", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "processedbies",
                    localField: "processedById",
                    foreignField: "_id",
                    as: "processedBy"
                }
            },
            { $unwind: { path: "$processedBy", preserveNullAndEmptyArrays: true } }
        ];

        // Apply filters
        const filterStage = {};
        if (loanType) {
            filterStage["lead.productType"] = { $regex: new RegExp(loanType, "i") };
        }
        if (advisorName) {
            filterStage["advisor.name"] = { $regex: new RegExp(advisorName, "i") };
        }
        if (Object.keys(filterStage).length > 0) {
            pipeline.push({ $match: filterStage });
        }

        pipeline.push({
            $project: {
                leadNo: "$lead.leadNo",
                disbursalDate: "$disbursalDate",
                clientName: "$lead.clientName",
                product: "$lead.productType",
                disbursalAmt: "$disbursalAmount",
                advisor: "$advisor.name",
                bank: "$bank.name",
                banker: "$banker.bankerName",
                invoiceNo: "$invoiceNo",
                invoiceDate: "$invoiceDate",
                billAmt: "$payoutAmount",
                gstPercentage: "$gstPercent",
                gstAmt: "$gstAmount",
                paidAmt: {
                   $cond: {
                      if: { $gt: ["$gstAmount", 0] },
                      then: { $subtract: ["$gstAmount", "$remainingGstAmount"] },
                      else: 0
                   }
                },
                processedBy: "$processedBy.processedBy",
                pendingAmt: "$remainingGstAmount",
                status: {
                    $cond: {
                        if: { $lte: ["$remainingGstAmount", 0] },
                        then: "Paid",
                        else: "Pending"
                    }
                }
            }
        });

        if (status) {
            pipeline.push({
                $match: {
                    status: { $regex: new RegExp(status, "i") }
                }
            });
        }

        pipeline.push({ $sort: { leadNo: -1, invoiceDate: -1 } });
        
        const in_db = await AdvisorPayout.aggregate(pipeline);
        const paginatedData = in_db.slice((page - 1) * limit, page * limit);
        
        const totals = in_db.reduce((acc, curr) => {
            acc.disbursalAmt += (curr.disbursalAmt || 0);
            acc.billAmt += (curr.billAmt || 0);
            acc.gstAmt += (curr.gstAmt || 0);
            acc.paidAmt += (curr.paidAmt || 0);
            acc.pendingAmt += (curr.pendingAmt || 0);
            return acc;
        }, { disbursalAmt: 0, billAmt: 0, gstAmt: 0, paidAmt: 0, pendingAmt: 0 });

        return {
            totalData: in_db.length,
            totalPages: Math.ceil(in_db.length / limit),
            currentPage: page,
            totals: totals,
            data: paginatedData
        };
    }
    async getPerformanceReport(req, res, next) {
        let { loanType, advisorName, fromDate, toDate, page = 1, limit = 1000 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const matchStage = {};
        if (fromDate || toDate) {
            matchStage.invoiceDate = {};
            if (fromDate) matchStage.invoiceDate.$gte = new Date(fromDate);
            if (toDate) matchStage.invoiceDate.$lte = new Date(toDate);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "leads",
                    localField: "leadId",
                    foreignField: "_id",
                    as: "lead"
                }
            },
            { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "advisors",
                    localField: "lead.advisorId",
                    foreignField: "_id",
                    as: "advisor"
                }
            },
            { $unwind: { path: "$advisor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "bankers",
                    localField: "lead.bankerId",
                    foreignField: "_id",
                    as: "banker"
                }
            },
            { $unwind: { path: "$banker", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "banks",
                    localField: "banker.bank",
                    foreignField: "_id",
                    as: "bank"
                }
            },
            { $unwind: { path: "$bank", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "employees",
                    localField: "lead.allocatedTo",
                    foreignField: "_id",
                    as: "employee"
                }
            },
            { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "processedbies",
                    localField: "processedById",
                    foreignField: "_id",
                    as: "processedBy"
                }
            },
            { $unwind: { path: "$processedBy", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "advisorpayouts",
                    localField: "leadId",
                    foreignField: "leadId",
                    as: "payouts"
                }
            }
        ];

        // Apply filters
        const filterStage = {};
        if (loanType) {
            filterStage["lead.productType"] = { $regex: new RegExp(loanType, "i") };
        }
        if (advisorName) {
            filterStage["advisor.name"] = { $regex: new RegExp(advisorName, "i") };
        }
        if (Object.keys(filterStage).length > 0) {
            pipeline.push({ $match: filterStage });
        }

        pipeline.push({
            $project: {
                leadNo: "$lead.leadNo",
                disbursalDate: "$disbursalDate",
                clientName: "$lead.clientName",
                product: "$lead.productType",
                disbursalAmt: "$disbursalAmount",
                advisor: "$advisor.name",
                bank: "$bank.name",
                banker: "$banker.bankerName",
                disbursalMonth: {
                    $cond: {
                        if: { $ne: ["$disbursalDate", null] },
                        then: { $dateToString: { format: "%b - %Y", date: "$disbursalDate" } },
                        else: ""
                    }
                },
                employee: "$employee.name",
                grossRecd: { $ceil: { $ifNull: ["$payoutAmount", 0] } },
                grossPaid: { $ceil: { $sum: "$payouts.payoutAmount" } },
                grossProfit: {
                    $ceil: {
                        $subtract: [
                            { $ifNull: ["$payoutAmount", 0] },
                            { $sum: "$payouts.payoutAmount" }
                        ]
                    }
                },
                tdsPaid: { $ceil: { $ifNull: ["$tdsAmount", 0] } },
                tdsDeducted: { $ceil: { $sum: "$payouts.tdsAmount" } },
                netRecd: { $ceil: { $ifNull: ["$netReceivableAmount", 0] } },
                netPaid: { $ceil: { $sum: "$payouts.netPayableAmount" } },
                cashProfit: {
                    $ceil: {
                        $subtract: [
                            { $ifNull: ["$netReceivableAmount", 0] },
                            { $sum: "$payouts.netPayableAmount" }
                        ]
                    }
                },
                processedBy: "$processedBy.processedBy"
            }
        });

        pipeline.push({ $sort: { leadNo: -1, disbursalDate: -1 } });
        
        const in_db = await Invoice.aggregate(pipeline);
        const paginatedData = in_db.slice((page - 1) * limit, page * limit);
        
        const totals = in_db.reduce((acc, curr) => {
            acc.disbursalAmt += (curr.disbursalAmt || 0);
            acc.grossRecd += (curr.grossRecd || 0);
            acc.grossPaid += (curr.grossPaid || 0);
            acc.grossProfit += (curr.grossProfit || 0);
            acc.tdsPaid += (curr.tdsPaid || 0);
            acc.tdsDeducted += (curr.tdsDeducted || 0);
            acc.netRecd += (curr.netRecd || 0);
            acc.netPaid += (curr.netPaid || 0);
            acc.cashProfit += (curr.cashProfit || 0);
            return acc;
        }, { disbursalAmt: 0, grossRecd: 0, grossPaid: 0, grossProfit: 0, tdsPaid: 0, tdsDeducted: 0, netRecd: 0, netPaid: 0, cashProfit: 0 });

        return {
            totalData: in_db.length,
            totalPages: Math.ceil(in_db.length / limit),
            currentPage: page,
            totals: totals,
            data: paginatedData
        };
    }
}

export default new ReportService();