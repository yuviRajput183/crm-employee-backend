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

            let stamp = null;
            let signature = null;

            if (req.files) {
                if (req.files.stamp && req.files.stamp.length > 0) {
                    stamp = req.files.stamp[0].filename;
                }
                if (req.files.sign && req.files.sign.length > 0) {
                    signature = req.files.sign[0].filename;
                }
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
                stamp,
                signature,
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

            let stamp = location.stamp;
            let signature = location.signature;

            if (req.files) {
                if (req.files.stamp && req.files.stamp.length > 0) {
                    stamp = req.files.stamp[0].filename;
                }
                if (req.files.sign && req.files.sign.length > 0) {
                    signature = req.files.sign[0].filename;
                }
            }

            location.name = name || location.name;
            location.state = state || location.state;
            location.address = address !== undefined ? address : location.address;
            location.gstin = gstin !== undefined ? gstin : location.gstin;
            location.mobile = mobile || location.mobile;
            location.email = email || location.email;
            location.authorizedSignatoryName = authorizedSignatoryName !== undefined ? authorizedSignatoryName : location.authorizedSignatoryName;
            location.authorizedSignatoryDesignation = authorizedSignatoryDesignation !== undefined ? authorizedSignatoryDesignation : location.authorizedSignatoryDesignation;
            location.stamp = stamp;
            location.signature = signature;
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