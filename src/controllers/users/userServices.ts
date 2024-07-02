import { v2 } from "cloudinary";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { redis } from "../../config/redis";
import { catchAsyncErrors } from "../../middlewares/catchAsyncErrors";
import { User } from "../../models/usersModel";
import { IUser } from "../../types/users";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { sendMail } from "../../utils/sendMail";
import { accessOptions } from "../../utils/jwt";
import { Product } from "../../models/productsModel";
import { IProduct } from "../../types/product";

export const getInfo = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user;

      const userString = await redis.get(_id);

      const user =
        (await JSON.parse(userString as string)) || (await User.findById(_id));

      if (!userString) await redis.set(_id, JSON.stringify(user));
      if (!user) return next(new ErrorHandler("User not found.", 404));

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateAvatar = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user;
      const user = await User.findById(_id);

      if (!user) return next(new ErrorHandler("User not found.", 404));
      if (!req.file) return next(new ErrorHandler("Image is required!", 400));

      const image = req.file.path;
      const publicId = user.avatar.public_id;

      let cloud;
      if (publicId) {
        await v2.uploader.destroy(publicId);
        cloud = await v2.uploader.upload(image, {
          folder: "avatar",
        });
      } else {
        cloud = await v2.uploader.upload(image, {
          folder: "avatar",
        });
      }

      user.avatar = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };

      await user.save();
      await redis.set(_id, JSON.stringify(user));
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateInfo = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user;
      const { email, password, ...updateData } = req.body;

      if (email || password)
        return next(
          new ErrorHandler("You can not access this resource here.", 400)
        );

      const availableEdit = ["name", "gender", "phone"];
      if (
        !Object.keys(updateData).every((key) => availableEdit.includes(key))
      ) {
        return next(new ErrorHandler("Invalid update fields.", 400));
      }

      const newUser = await User.findByIdAndUpdate(
        _id,
        { $set: updateData },
        { new: true }
      );
      await redis.set(_id, JSON.stringify(newUser));
      res.status(200).json({
        success: true,
        user: newUser,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateEmail = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user;

      const { email } = req.body;
      if (!email) return next(new ErrorHandler("Email is required.", 400));

      if (email) {
        const isExistEmail = await User.findOne({ email });
        if (isExistEmail)
          return next(new ErrorHandler("Email is already exist.", 400));

        const user: IUser =
          (await JSON.parse((await redis.get(_id)) as string)) ||
          (await User.findById(_id));

        if (!user) return next(new ErrorHandler("User not found.", 404));

        const code = crypto.randomInt(100000, 999999).toString();
        const verificationToken = jwt.sign(
          {
            _id,
            newEmail: email,
            oldEmail: user.email,
            code,
          },
          process.env.JWT_UPDATE_EMAIL_SECRET as Secret,
          {
            expiresIn: process.env.JWT_EXPIRES,
          }
        );

        try {
          const data = {
            name: user.name,
            code,
          };

          await sendMail({
            email: email,
            subject: "Active Email",
            template: "/user/email/emailOTP.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 400));
        }

        res.status(201).json({
          success: true,
          verificationToken,
          message: `Please check your email: ${email} to activate your email.`,
        });
      } else {
        return next(
          new ErrorHandler("You can not access this resource here.", 400)
        );
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const verifyEmail = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verificationToken: token, clientCode } = req.body;

      const decoded = jwt.verify(
        token,
        process.env.JWT_UPDATE_EMAIL_SECRET as Secret
      ) as JwtPayload;
      if (!decoded) return next(new ErrorHandler("Invalid token", 400));

      const { _id, oldEmail, newEmail, code } = decoded;

      if (clientCode !== code)
        return next(new ErrorHandler("Invalid Code.", 400));

      const user = await User.findByIdAndUpdate(
        _id,
        { $set: { email: newEmail } },
        { new: true }
      );

      await redis.set(_id, JSON.stringify(user));

      try {
        const data = {
          name: user?.name,
          newEmail,
        };

        await sendMail({
          email: oldEmail,
          subject: "Update Email",
          template: "/user/email/updateEmail.ejs",
          data,
        });
        await sendMail({
          email: newEmail,
          subject: "Update Email",
          template: "/user/email/updateEmail.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
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

export const updatePassword = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user;
      const user = await User.findById(_id).select("+password");
      if (!user) return next(new ErrorHandler("User not found", 404));

      const { oldPassword, newPassword } = req.body;
      if (!oldPassword)
        return next(new ErrorHandler("Old password is required", 400));
      if (!newPassword)
        return next(new ErrorHandler("New password is required", 400));

      const isValidPassword: boolean = await user.comparePassword(oldPassword);
      if (!isValidPassword)
        return next(new ErrorHandler("Wrong Password", 400));

      user.password = newPassword;
      await user.save();

      await redis.set(_id, JSON.stringify(user));

      try {
        const data = {
          name: user.name,
        };
        await sendMail({
          email: user.email,
          subject: "Update Password",
          template: "/user/password/updatePassword.ejs",
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

export const deleteAccount = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user;
      const user = await User.findById(_id);
      if (!user) return next(new ErrorHandler("User not found", 404));

      const { name, email } = user;

      const code = crypto.randomInt(100000, 999999).toString();
      const verificationToken = jwt.sign(
        {
          _id,
          name,
          email,
          code,
        },
        process.env.JWT_DELETE_SECRET as Secret,
        { expiresIn: process.env.JWT_EXPIRES }
      );

      try {
        const data = {
          name,
          code,
        };

        await sendMail({
          email,
          subject: "Account Deletion Confirmation",
          template: "/user/delete/deleteAccount.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      res.status(200).json({
        success: true,
        verificationToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const confirmDelete = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verificationToken: token, clientCode } = req.body;

      const decoded = jwt.verify(
        token,
        process.env.JWT_DELETE_SECRET as Secret
      ) as JwtPayload;
      if (!decoded) return next(new ErrorHandler("Invalid token", 400));

      const { _id, name, email, code } = decoded;

      if (clientCode !== code)
        return next(new ErrorHandler("Invalid Code.", 400));

      try {
        const data = {
          name,
        };

        await sendMail({
          email,
          subject: "Delete Account",
          template: "/user/delete/confirmDelete.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      await redis.del(_id);
      await User.findByIdAndDelete(_id);

      res.cookie("refreshToken", "", {
        expires: new Date(Date.now() + 1000),
        maxAge: 1000,
        httpOnly: true,
        signed: true,
        sameSite: "lax",
      });
      res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const addLove = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      const product: IProduct = (await Product.findById(productId)) as IProduct;
      if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }
      if (!user.love.includes(productId)) {
        user.love.push(productId);
        product.loveCount += 1;

        await user.save();
        await product.save();

        await redis.set(req.user._id, JSON.stringify(user));
        await redis.set(productId, JSON.stringify(product));
        await redis.del("products");

        res.status(200).json({
          success: true,
        });
      } else {
        return next(
          new ErrorHandler("Product is already loved by the user.", 400)
        );
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const removeLove = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      const product: IProduct = (await Product.findById(productId)) as IProduct;
      if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }
      if (user.love.includes(productId)) {
        user.love = user.love.filter((ele) => ele.toString() !== productId);

        if (product.loveCount > 0) {
          product.loveCount -= 1;
        } else {
          product.loveCount = 0;
        }

        await user.save();
        await product.save();

        await redis.set(req.user._id, JSON.stringify(user));
        await redis.set(productId, JSON.stringify(product));
        await redis.del("products");

        res.status(200).json({
          success: true,
        });
      } else {
        return next(
          new ErrorHandler("Product is not in the user's loved list.", 400)
        );
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
