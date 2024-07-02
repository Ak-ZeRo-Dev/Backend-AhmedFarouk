import { NextFunction, Request, Response } from "express";
import corn from "node-cron";
import { Notification } from "../../models/notificationsModel";
import { catchAsyncErrors } from "../../middlewares/catchAsyncErrors";
import { ErrorHandler } from "../../utils/ErrorHandler";

//Get All Notifications
export const getNotifications = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await Notification.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Read One Notification
export const readOne = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await Notification.findByIdAndUpdate(
        req.params.notificationId,
        { status: "read" },
        { new: true }
      );
      await updated?.save();

      const notifications = await Notification.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        readNotification: updated,
        notifications,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//Make All Read Notifications
export const readAll = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Notification.updateMany({ status: "unread" }, { status: "read" });

      const notifications = await Notification.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//Delete Read Notification Every 30 Day
const schedule = "0 0 0 * * *";
const deleteData = async () => {
  try {
    const days = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const result = await Notification.deleteMany({
      status: "read",
      createdAt: {
        $gte: cutoffDate,
        $lt: new Date(),
      },
    });
    console.log(`Deleted ${result.deletedCount} documents from Notification`);
  } catch (error) {
    console.error(`Error deleting data from Notification:`, error);
  }
};

corn.schedule(schedule, deleteData);
