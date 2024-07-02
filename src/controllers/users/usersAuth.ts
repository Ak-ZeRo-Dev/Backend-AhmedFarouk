import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { redis } from "../../config/redis";
import { catchAsyncErrors } from "../../middlewares/catchAsyncErrors";
import { User } from "../../models/usersModel";
import { IUser } from "../../types/users";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { sendToken, updateToken } from "../../utils/jwt";
import { sendMail } from "../../utils/sendMail";

export const register = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body;

      const user: IUser | null = await User.findOne({ email });
      if (user) return next(new ErrorHandler("User already exist.", 401));

      const code = crypto.randomInt(100000, 999999).toString();

      const verificationToken: string = jwt.sign(
        { user: req.body, code },
        process.env.JWT_ACTIVATION_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES }
      );

      try {
        const data = { name, code };
        await sendMail({
          email,
          subject: "Activation Email",
          template: "/user/activation/activationOTP.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      res.status(201).json({
        success: true,
        verificationToken,
        message: `Please check your email: ${email} to activate your account.`,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const verification = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verificationToken, clientCode } = req.body;

      const decoded = jwt.verify(
        verificationToken,
        process.env.JWT_ACTIVATION_SECRET as string
      ) as JwtPayload;
      const { user, code } = decoded;
      if (Number(clientCode) !== Number(code))
        return next(
          new ErrorHandler("Wrong activation code. please try again.", 401)
        );

      const newUser = await User.create(user);
      newUser.isVerified = true;
      await newUser.save();

      res.status(201).json({
        success: true,
        user: newUser,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const login = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (!email && !password)
        return next(new ErrorHandler("Please enter email and password", 400));
      if (!email) return next(new ErrorHandler("Please enter email", 400));
      if (!password)
        return next(new ErrorHandler("Please enter password", 400));

      let user = await User.findOne({ email }).select("+password");
      if (!user) return next(new ErrorHandler("Invalid email.", 401));

      const isValidPassword: boolean = await user.comparePassword(password);
      if (!isValidPassword)
        return next(new ErrorHandler("Invalid password.", 401));

      user = (await User.findOne({ email }).select("-password")) as IUser;

      await sendToken(user, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const logout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("refreshToken", "", { maxAge: 1 });

      await redis.del(req.user?._id);
      res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const refresh = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.signedCookies;

      const decoded: any = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_KEY as Secret
      );

      const message = "Could not refresh token";

      if (!decoded) return next(new ErrorHandler(message, 401));

      const session = await redis.get(decoded._id);
      if (!session) return next(new ErrorHandler(message, 400));

      const user = await JSON.parse(session);
      await updateToken(user, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const forgotPassword = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, newPassword } = req.body;
      if (!email) return next(new ErrorHandler("Email is required.", 400));

      const existUser = await User.findOne({ email });
      if (!existUser) return next(new ErrorHandler("Invalid Email.", 400));

      const code = crypto.randomInt(100000, 999999).toString();

      const forgotToken: string = jwt.sign(
        { email, newPassword, code },
        process.env.JWT_FORGOT_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES }
      );

      try {
        await sendMail({
          email,
          subject: "Forgot Password",
          template: "user/password/forgotPassword.ejs",
          data: { name: existUser.name, code },
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      res.status(201).json({
        success: true,
        forgotToken,
        message: `Please check your email: ${email} to change your password.`,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const confirmChangedPassword = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { forgotToken, clientCode } = req.body;

      const decoded = jwt.verify(
        forgotToken,
        process.env.JWT_FORGOT_SECRET as string
      ) as JwtPayload;
      const { email, newPassword, code } = decoded;
      if (Number(clientCode) !== Number(code))
        return next(new ErrorHandler("Wrong OTP code. please try again.", 401));

      const user = await User.findOne({ email });
      if (!user) return next(new ErrorHandler("User Not Found.", 404));

      user.password = newPassword;
      await user.save();
      await redis.set(user?._id, JSON.stringify(user));

      res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const socialAuth = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, avatar } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        const newUser = await User.create({ email, name, avatar });
        newUser.isVerified = true;
        await newUser.save();
        sendToken(newUser, res);
      } else {
        sendToken(user, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
