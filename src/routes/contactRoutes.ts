import express from "express";
import { sendMessage } from "../controllers/contact/contactController";

export const contactRouter = express.Router();

contactRouter.route("/send-message").post(sendMessage);
