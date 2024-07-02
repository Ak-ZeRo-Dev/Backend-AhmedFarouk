import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../../middlewares/catchAsyncErrors";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { Notification } from "../../models/notificationsModel";
import { sendMail } from "../../utils/sendMail";

export const sendMessage = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, phoneNumber, email, message } = req.body;
      if (!name) return next(new ErrorHandler("Name is Required.", 400));
      if (!email) return next(new ErrorHandler("Email is Required.", 400));
      if (!message) return next(new ErrorHandler("Message is Required.", 400));

      try {
        const data = {
          name,
          phoneNumber,
          email,
          message,
        };

        const myAccount = process.env.SMTP_MAIL as string;

        await sendMail({
          email: myAccount,
          subject: `رسالة من العميل: ${name}`,
          template: "contact/customerMessage.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      await Notification.create({
        title: `Message from the customer: ${name}`,
        name,
        email,
        phoneNumber,
        message,
      });
      res.status(200).json({
        success: true,
        message: "تم ارسال الرسالة. سنرد عليك في اقرب وقت ممكن.",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
