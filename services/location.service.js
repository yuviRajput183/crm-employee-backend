import ErrorResponse from "../lib/error.res.js";
import Location from "../models/Location.model.js";

class LocationService {
    async addLocation(req, res, next) {
        try {
            const {
                name,
                state,
                address,
                gstin,
                mobile,
                email,
                authorizedSignatoryName,
                authorizedSignatoryDesignation,
                accountHolderName,
                accountNumber,
                ifscCode,
            } = req.body;

            // Check for duplicate mobile
            const existingMobile = await Location.findOne({ mobile });
            if (existingMobile) {
                return next(ErrorResponse.badRequest("Mobile number already exists"));
            }

            let stampAndSign = null;

            if (req.file) {
                stampAndSign = req.file.filename;
            }

            const newLocation = new Location({
                name,
                state,
                address,
                gstin,
                mobile,
                email,
                authorizedSignatoryName,
                authorizedSignatoryDesignation,
                stampAndSign,
                accountHolderName,
                accountNumber,
                ifscCode,
            });

            await newLocation.save();

            return res.status(201).json({
                success: true,
                message: "Location added successfully",
                data: newLocation,
            });
        } catch (error) {
            next(error);
        }
    }

    async getLocations(req, res, next) {
        try {
            const locations = await Location.find().sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                count: locations.length,
                data: locations,
            });
        } catch (error) {
            next(error);
        }
    }

    async getLocationById(req, res, next) {
        try {
            const location = await Location.findById(req.params.id);
            if (!location) {
                return next(ErrorResponse.notFound("Location not found"));
            }
            return res.status(200).json({
                success: true,
                data: location,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateLocation(req, res, next) {
        try {
            const { id } = req.params;
            const {
                name,
                state,
                address,
                gstin,
                mobile,
                email,
                authorizedSignatoryName,
                authorizedSignatoryDesignation,
                accountHolderName,
                accountNumber,
                ifscCode,
            } = req.body;

            let location = await Location.findById(id);
            if (!location) {
                return next(ErrorResponse.notFound("Location not found"));
            }

            // Check for duplicate mobile if mobile is being changed
            if (mobile && mobile !== location.mobile) {
                const existingMobile = await Location.findOne({ mobile });
                if (existingMobile) {
                    return next(ErrorResponse.badRequest("Mobile number already exists"));
                }
            }

            let stampAndSign = location.stampAndSign;

            if (req.file) {
                stampAndSign = req.file.filename;
            }

            location.name = name || location.name;
            location.state = state || location.state;
            location.address = address !== undefined ? address : location.address;
            location.gstin = gstin !== undefined ? gstin : location.gstin;
            location.mobile = mobile || location.mobile;
            location.email = email || location.email;
            location.authorizedSignatoryName = authorizedSignatoryName !== undefined ? authorizedSignatoryName : location.authorizedSignatoryName;
            location.authorizedSignatoryDesignation = authorizedSignatoryDesignation !== undefined ? authorizedSignatoryDesignation : location.authorizedSignatoryDesignation;
            location.stampAndSign = stampAndSign;
            location.accountHolderName = accountHolderName !== undefined ? accountHolderName : location.accountHolderName;
            location.accountNumber = accountNumber !== undefined ? accountNumber : location.accountNumber;
            location.ifscCode = ifscCode !== undefined ? ifscCode : location.ifscCode;

            await location.save();

            return res.status(200).json({
                success: true,
                message: "Location updated successfully",
                data: location,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new LocationService();