import { Response } from "express";
import { redis } from "../config/redis";
import { ITokenOptions, IUser } from "../types/users";
import jwt, { Secret } from "jsonwebtoken";

const accessExpire = parseInt(process.env.JWT_EXPIRES || "5", 10);
const refreshExpire = parseInt(process.env.JWT_REFRESH_EXPIRES || "3", 10);

export const accessOptions: ITokenOptions = {
  expire: new Date(Date.now() + accessExpire * 60 * 1000),
  maxAge: accessExpire * 60 * 1000,
  httpOnly: true,
  signed: true,
  sameSite: "lax",
};

const refreshOptions: ITokenOptions = {
  expire: new Date(Date.now() + refreshExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  signed: true,
  sameSite: "lax",
};

export const sendToken = async (user: IUser, res: Response) => {
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  await redis.set(user._id, JSON.stringify(user));

  if (process.env.NODE_ENV === "production") accessOptions.secure = true;

  res.cookie("refreshToken", refreshToken, refreshOptions);
  res.status(200).json({
    success: true,
    accessToken,
    user,
  });
};

export const updateToken = async (user: IUser, res: Response) => {
  const accessToken = jwt.sign(
    { _id: user._id },
    process.env.JWT_ACCESS_KEY as Secret,
    { expiresIn: process.env.JWT_EXPIRES }
  );

  const refreshToken = jwt.sign(
    { _id: user._id },
    process.env.JWT_REFRESH_KEY as Secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES }
  );

  if (process.env.NODE_ENV === "production") accessOptions.secure = true;

  res.cookie("refreshToken", refreshToken, refreshOptions);

  await redis.set(user._id, JSON.stringify(user), "EX", 604800);

  res.status(200).json({
    success: true,
    accessToken,
  });
};
