import {
  addLayout,
  getLayout,
  updateImage,
  updateLayout,
} from "../controllers/layout/layoutController";
import { userRoles } from "../enums/user";
import { isAuthenticated, authorizeRoles } from "../middlewares/auth";
import express from "express";
import { upload } from "../middlewares/multer";

export const layoutRouter = express.Router();

const { master, admin } = userRoles;

layoutRouter.route("/get-all-layout").get(getLayout);

layoutRouter
  .route("/update-image")
  .patch(
    isAuthenticated,
    authorizeRoles(master),
    upload.single("image"),
    updateImage
  );

layoutRouter.route("/update-layout").patch(updateLayout);
layoutRouter.route("/add-layout").post(addLayout);
