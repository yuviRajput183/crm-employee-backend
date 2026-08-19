import ErrorResponse from "../lib/error.res.js";
import Product from "../models/Product.model.js";
import Employee from "../models/Employee.model.js";

class ProductService {
  /**
   * addProduct - Add a new product.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async addProduct(req, res, next) {
    const { name } = req.body;

    const createdBy = req.user.referenceId;
    const groupId = req.user.groupId;

    if (!name || name.trim() === "") {
      return next(ErrorResponse.badRequest("Product name is required"));
    }

    const cleanName = name.trim();

    const exist = await Product.findOne({
      name: { $regex: `^${cleanName}$`, $options: "i" },
    });
    if (exist) {
      return next(ErrorResponse.badRequest("Product already exists"));
    }

    const product = await Product.create({
      name: cleanName,
      createdBy,
      groupId,
    });

    return {
      data: product,
      message: "Product added successfully",
    };
  }

  /**
   * listProducts - List all products.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async listProducts(req, res, next) {
    const loginUserId = req.user.referenceId;

    const currentUser = await Employee.findById(loginUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in employee not found"));
    }

    const products = await Product.find({
      groupId: currentUser.groupId,
    }).sort({ createdAt: -1 });

    return {
      data: products,
      message: "Products fetched successfully",
    };
  }

  /**
   * editProduct - Edit a product name.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async editProduct(req, res, next) {
    const { name, productId } = req.body;
    const loggedInUserId = req.user.referenceId;

    const cleanName = name.trim();

    const product = await Product.findById(productId);
    if (!product) {
      return next(ErrorResponse.notFound("Product not found"));
    }

    // Don't allow editing of default/system products
    if (product.isDefault) {
      return next(
        ErrorResponse.forbidden("Default product cannot be edited")
      );
    }

    if (product.createdBy.toString() !== loggedInUserId.toString()) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to edit this product"
        )
      );
    }

    // Check if a different product already has this name (case-insensitive)
    const existing = await Product.findOne({
      name: { $regex: `^${cleanName}$`, $options: "i" },
      _id: { $ne: productId },
    });

    if (existing) {
      return next(
        ErrorResponse.badRequest(
          "Another product with this name already exists"
        )
      );
    }
    product.name = cleanName;

    await product.save();
    return {
      data: product,
      message: "Product name updated successfully",
    };
  }

  /**
   * addSubProductToProduct - Add a sub product to a product.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async addSubProductToProduct(req, res, next) {
    const { productId, subProduct } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return next(ErrorResponse.notFound("Product not found"));
    }

    // Authorization check
    if (product.createdBy.toString() !== req.user.referenceId.toString()) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to modify this product"
        )
      );
    }

    const cleanedSubProduct = subProduct.trim();
    const alreadyExists = product.subProducts && product.subProducts.some(
      (d) => d.toLowerCase() === cleanedSubProduct.toLowerCase()
    );

    if (alreadyExists) {
      return next(
        ErrorResponse.badRequest(
          "Sub product already exists in this product"
        )
      );
    }

    if (!product.subProducts) {
      product.subProducts = [];
    }
    
    product.subProducts.push(cleanedSubProduct);
    await product.save();

    return {
      data: product,
      message: "Sub product added successfully",
    };
  }

  /**
   * getSubProductsByProduct - Get all sub products in a product on the basis of product id.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async getSubProductsByProduct(req, res, next) {
    const { productId } = req.query;

    const product = await Product.findById(productId).select(
      "name subProducts"
    );
    if (!product) {
      return next(ErrorResponse.notFound("Product not found"));
    }
    return {
      data: {
        productName: product.name,
        subProducts: product.subProducts || [],
      },
      message: "Sub products fetched successfully",
    };
  }

  /**
   * editSubProductInProduct - Edit a sub product in a product on the basis of product id and old sub product.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async editSubProductInProduct(req, res, next) {
    const { oldSubProduct, newSubProduct, productId } = req.body;
    const loggedInUserId = req.user.referenceId;

    const product = await Product.findById(productId);
    if (!product) {
      return next(ErrorResponse.notFound("Product not found"));
    }

    // Authorization: only allow if product is created by this user
    if (product.createdBy?.toString() !== loggedInUserId.toString()) {
      return next(
        ErrorResponse.forbidden(
          "You are not authorized to edit this sub product"
        )
      );
    }

    const cleanOld = oldSubProduct.trim();
    const cleanNew = newSubProduct.trim();

    if (!product.subProducts) {
       product.subProducts = [];
    }

    const index = product.subProducts.indexOf(cleanOld);
    if (index === -1) {
      return next(
        ErrorResponse.badRequest("Sub product not found in this product")
      );
    }

    // Preventing duplicate sub product
    if (product.subProducts.includes(cleanNew)) {
      return next(
        ErrorResponse.badRequest(
          "Another sub product with this name already exists in this product"
        )
      );
    }

    // Update sub product
    product.subProducts[index] = cleanNew;
    await product.save();

    // Optionally update sub product in related entities if needed (like Employee in department)
    // Assuming no other models rely on it for now.

    return {
      data: product,
      message: "Sub product updated successfully",
    };
  }
}

export default new ProductService();
