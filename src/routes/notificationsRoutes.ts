import express from "express";
import { isAuthenticated } from "../middlewares/auth";
import {
  getNotifications,
  readAll,
  readOne,
} from "../controllers/notifications/notificationsController";

export const notificationsRouter = express.Router();

notificationsRouter
  .route("/get-all-notifications")
  .get(isAuthenticated, getNotifications);

notificationsRouter
  .route("/read-one/:notificationId")
  .patch(isAuthenticated, readOne);

notificationsRouter.route("/read-all").patch(isAuthenticated, readAll);
