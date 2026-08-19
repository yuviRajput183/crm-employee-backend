import ErrorResponse from "../lib/error.res.js";
import ServiceProvider from "../models/ServiceProvider.model.js";

class ServiceProviderService {
    async addServiceProvider(req, res, next) {
        try {
            const {
                legalName,
                alias,
                type,
                address,
                state,
                stateCode,
                gstin,
                code,
                location,
            } = req.body;
            
            let billingFormat = req.body.billingFormat;
            if (req.file) {
                billingFormat = req.file.path.replace(/\\/g, "/");
            }

            const newServiceProvider = new ServiceProvider({
                legalName,
                alias,
                type,
                address,
                state,
                stateCode,
                gstin,
                code,
                billingFormat,
                location,
            });

            await newServiceProvider.save();

            return res.status(201).json({
                success: true,
                message: "Service Provider added successfully",
                data: newServiceProvider,
            });
        } catch (error) {
            next(error);
        }
    }

    async getServiceProviders(req, res, next) {
        try {
            const providers = await ServiceProvider.find().populate("location").sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                count: providers.length,
                data: providers,
            });
        } catch (error) {
            next(error);
        }
    }

    async getServiceProviderById(req, res, next) {
        try {
            const provider = await ServiceProvider.findById(req.params.id).populate("location");
            if (!provider) {
                return next(ErrorResponse.notFound("Service Provider not found"));
            }
            return res.status(200).json({
                success: true,
                data: provider,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateServiceProvider(req, res, next) {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            
            if (req.file) {
                updateData.billingFormat = req.file.path.replace(/\\/g, "/");
            }

            let provider = await ServiceProvider.findById(id);
            if (!provider) {
                return next(ErrorResponse.notFound("Service Provider not found"));
            }

            provider = await ServiceProvider.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return res.status(200).json({
                success: true,
                message: "Service Provider updated successfully",
                data: provider,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new ServiceProviderService();
