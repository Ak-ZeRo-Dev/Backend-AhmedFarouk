import {
  isAuthenticated,
  authorizeRoles,
  isSameUser,
} from "./../middlewares/auth";
import express from "express";
import {
  block,
  deleteUser,
  getAllUsers,
  getUser,
  unblock,
  updateRole,
  updateUserEmail,
  verifyUpdateUserEmail,
} from "../controllers/users/usersController";
import {
  verification,
  confirmChangedPassword,
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  socialAuth,
} from "../controllers/users/usersAuth";
import { userRoles } from "../enums/user";
import {
  verifyEmail,
  confirmDelete,
  deleteAccount,
  getInfo,
  updateAvatar,
  updateEmail,
  updateInfo,
  updatePassword,
  addLove,
  removeLove,
} from "../controllers/users/userServices";
import { upload } from "../middlewares/multer";

export const userRouter = express.Router();

const { admin, master } = userRoles;

// Auth
userRouter.route("/register").post(register);

userRouter.route("/verification").post(verification);

userRouter.route("/social-auth").post(socialAuth);

userRouter.route("/login").post(login);

userRouter.route("/refresh").get(refresh);

userRouter.route("/forgot-password").post(forgotPassword);

userRouter.route("/confirm-changed-password").post(confirmChangedPassword);

userRouter.route("/logout").post(isAuthenticated, logout);

// Services
userRouter.route("/me").get(isAuthenticated, getInfo);

userRouter.patch(
  "/me/update-avatar",
  isAuthenticated,
  upload.single("avatar"),
  updateAvatar
);

userRouter.route("/me/update-info").patch(isAuthenticated, updateInfo);

userRouter.route("/me/update-email").patch(isAuthenticated, updateEmail);
userRouter.route("/me/verify-email").patch(isAuthenticated, verifyEmail);

userRouter.route("/me/update-password").patch(isAuthenticated, updatePassword);

userRouter.route("/me/delete-account").get(isAuthenticated, deleteAccount);
userRouter.route("/me/confirm-delete").delete(isAuthenticated, confirmDelete);

userRouter.route("/me/add-love/:productId").patch(isAuthenticated, addLove);
userRouter
  .route("/me/remove-love/:productId")
  .patch(isAuthenticated, removeLove);

// Controllers
userRouter
  .route("/admin/get-all-users")
  .get(isAuthenticated, authorizeRoles(admin, master), getAllUsers);

userRouter
  .route("/admin/get-user/:id")
  .get(isAuthenticated, authorizeRoles(admin, master), isSameUser, getUser);

userRouter
  .route("/admin/update-user-email/:id")
  .patch(
    isAuthenticated,
    authorizeRoles(admin, master),
    isSameUser,
    updateUserEmail
  );

userRouter.route("/admin/verification").patch(verifyUpdateUserEmail);

userRouter
  .route("/admin/block/:id")
  .patch(isAuthenticated, authorizeRoles(admin, master), isSameUser, block);

userRouter
  .route("/admin/unblock/:id")
  .patch(isAuthenticated, authorizeRoles(admin, master), isSameUser, unblock);

userRouter
  .route("/admin/update-role/:id")
  .patch(isAuthenticated, authorizeRoles(master), isSameUser, updateRole);

userRouter
  .route("/admin/delete-user/:id")
  .delete(isAuthenticated, authorizeRoles(master), isSameUser, deleteUser);
