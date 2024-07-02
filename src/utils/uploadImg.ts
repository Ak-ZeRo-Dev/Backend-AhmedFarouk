import { v2 } from "cloudinary";
import { IUser } from "../types/users";
import { ErrorHandler } from "./ErrorHandler";
import { NextFunction } from "express";

export const uploadImg = async (
  user: IUser,
  image: string,
  folder: "avatar" | "background",
  next: NextFunction
) => {
  try {
    const cloud = await v2.uploader.upload(image, {
      folder,
    });

    if (folder === "avatar") {
      user.avatar = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };
    } else {
      user.background = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };
    }
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};
