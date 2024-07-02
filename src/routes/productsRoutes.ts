import express from "express";
import { userRoles } from "../enums/user";
import { authorizeRoles, isAuthenticated } from "../middlewares/auth";
import {
  addProduct,
  deleteProduct,
  editProduct,
  getAllProducts,
  getProduct,
} from "../controllers/products/productsController";

export const productsRouter = express.Router();

const { admin, master } = userRoles;

productsRouter.route("/get-all-products").get(getAllProducts);

productsRouter.route("/get-product/:productId").get(getProduct);

productsRouter
  .route("/add-product")
  .post(isAuthenticated, authorizeRoles(admin, master), addProduct);

productsRouter
  .route("/edit-product/:productId")
  .patch(isAuthenticated, authorizeRoles(admin, master), editProduct);

productsRouter
  .route("/delete-products")
  .delete(isAuthenticated, authorizeRoles(admin, master), deleteProduct);
