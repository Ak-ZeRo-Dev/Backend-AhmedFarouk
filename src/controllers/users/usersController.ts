import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../../middlewares/catchAsyncErrors";
import { User } from "../../models/usersModel";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { redis } from "../../config/redis";
import { sendMail } from "../../utils/sendMail";
import { IUser } from "../../types/users";
import mongoose from "mongoose";
import { userRoles } from "../../enums/user";
import Jwt, { JwtPayload } from "jsonwebtoken";

const { admin, master } = userRoles;

export const getAllUsers = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, limit: limitData, page: pageData }: any = req.query;
      const { role } = req.user;

      const limit: number = Number(limitData) || 20;
      const page = Number(pageData) || 1;
      const skip: number = (page - 1) * limit;

      let criteria: any = {};

      if (search) {
        const searchRegex = new RegExp(search, "i");

        criteria.$or = [
          {
            name: searchRegex,
          },
          {
            email: searchRegex,
          },
          {
            role: searchRegex,
          },
        ];

        if (role === "admin") {
          criteria.$and = [{ role: { $ne: "master" } }];
        }

        if (mongoose.Types.ObjectId.isValid(search)) {
          criteria.$or.push({ _id: search });
        }
      } else {
        if (role === "admin") {
          criteria = { role: { $nin: [admin, master] } };
        } else if (role === master) {
          criteria = {};
        } else {
          return next(new ErrorHandler("Unauthorized access", 403));
        }
      }

      const users = await User.find(criteria)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      const totalCount = users.length;

      res.status(200).json({
        success: true,
        users,
        totalCount,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) next(new ErrorHandler("User Not Found", 404));

      if (user?.role === userRoles.master) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      if (user?.role === req.user?.role) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateUserEmail = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) return next(new ErrorHandler("ID is required.", 400));

      const { email, reason } = req.body;
      if (!reason) return next(new ErrorHandler("Reason is required.", 400));
      if (!email) return next(new ErrorHandler("Email is required.", 400));

      if (await User.findOne({ email }))
        return next(new ErrorHandler("Email already exist.", 400));

      const user = await User.findById(id);
      if (!user) return next(new ErrorHandler("User not found.", 404));

      if (user?.role === userRoles.master) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      if (user?.role === req.user?.role) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }
      const VerificationToken = Jwt.sign(
        { id, email, reason },
        process.env.JWT_UPDATE_EMAIL_SECRET as string,
        {
          expiresIn: process.env.JWT_EXPIRES,
        }
      );
      const url = `${process.env.FRONTEND_URL}/verification/update-email/${VerificationToken}`;

      try {
        const data = {
          name: user.name,
          email,
          reason,
          url,
        };
        console.log(email);
        console.log(user.email);
        await sendMail({
          email,
          subject: "Update Email",
          template: "/user/email/verifyUpdateUserEmail.ejs",
          data,
        });
        await sendMail({
          email: user.email,
          subject: "Update Email",
          template: "/user/email/updateUserEmail.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
export const verifyUpdateUserEmail = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { VerificationToken } = req.body;

      const decoded = Jwt.verify(
        VerificationToken,
        process.env.JWT_UPDATE_EMAIL_SECRET as string
      ) as JwtPayload;
      const { id, email, reason } = decoded;

      if (await User.findOne({ email }))
        return next(new ErrorHandler("Email already exist.", 400));

      const user = await User.findById(id);
      if (!user) return next(new ErrorHandler("User not found.", 404));

      if (user?.role === userRoles.master) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      if (user?.role === req.user?.role) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      try {
        const data = {
          name: user.name,
          email,
          reason,
        };
        await sendMail({
          email: user.email,
          subject: "Update Email",
          template: "/user/email/updateUserEmail.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      user.email = email;
      await user.save();
      await redis.set(id, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const block = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) return next(new ErrorHandler("ID is required.", 400));

      const { reason } = req.body;
      if (!reason) return next(new ErrorHandler("Reason is required.", 400));

      const user = await User.findById(id);

      if (user?.role === userRoles.master) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      if (user?.role === req.user?.role) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      const newUser = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            isBlocked: true,
          },
          $inc: { blockCount: 1 },
        },
        { new: true }
      );
      if (!newUser) return next(new ErrorHandler("User not found.", 404));

      try {
        const data = {
          name: newUser.name,
          reason,
        };
        await sendMail({
          email: newUser.email,
          subject: "Block Account",
          template: "/user/block-unblock/blockUser.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      await redis.set(id, JSON.stringify(newUser));

      res.status(200).json({
        success: true,
        user: newUser,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const unblock = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) return next(new ErrorHandler("ID is required.", 400));

      const user = await User.findById(id);

      if (user?.role === userRoles.master) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      if (user?.role === req.user?.role) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      const newUser = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            isBlocked: false,
          },
        },
        { new: true }
      );
      if (!newUser) return next(new ErrorHandler("User not found.", 404));

      try {
        const data = {
          name: newUser.name,
        };
        await sendMail({
          email: newUser.email,
          subject: "Unblock Account",
          template: "/user/block-unblock/unblockUser.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      await redis.set(id, JSON.stringify(newUser));

      res.status(200).json({
        success: true,
        user: newUser,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateRole = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) return next(new ErrorHandler("ID is required.", 400));

      const { role } = req.body;
      if (!role) return next(new ErrorHandler("Role is required.", 400));

      const user = await User.findById(id);

      if (user?.role === userRoles.master) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      if (user?.role === req.user?.role) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      const newUser = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            role,
          },
        },
        { new: true }
      );
      if (!newUser) return next(new ErrorHandler("User not found.", 404));

      try {
        const data = {
          name: newUser.name,
          role,
        };
        await sendMail({
          email: newUser.email,
          subject: "Update Role",
          template: "/user/role/updateRole.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      await redis.set(id, JSON.stringify(newUser));

      res.status(200).json({
        success: true,
        user: newUser,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const deleteUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) return next(new ErrorHandler("ID is required.", 400));

      const { reason } = req.body;
      if (!reason) return next(new ErrorHandler("Reason is required.", 400));

      const user = await User.findById(id);
      if (!user) return next(new ErrorHandler("User Not Found.", 404));

      if (user?.role === userRoles.master) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      if (user?.role === req.user?.role) {
        return next(new ErrorHandler("You can not access this resource.", 40));
      }

      try {
        const { name, email } = user;

        await sendMail({
          email,
          subject: "Delete Account",
          template: "/user/delete/deleteUser.ejs",
          data: { name, reason },
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      await User.deleteOne({ _id: id });
      await redis.del(id);

      res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
