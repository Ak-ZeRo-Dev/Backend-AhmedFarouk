import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../../middlewares/catchAsyncErrors";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { Layout } from "../../models/layoutModel";
import { redis } from "../../config/redis";
import { v2 } from "cloudinary";
import { ILayout } from "../../types/layout";

export const getLayout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let layout;
      const layoutString = await redis.get("layout");

      if (!layoutString) {
        layout = await Layout.find();

        if (!layout) return next(new ErrorHandler("Image not found", 404));

        await redis.set("layout", JSON.stringify(layout));
      } else {
        layout = await JSON.parse(layoutString);
      }

      res.status(200).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateImage = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      if (!type) return next(new ErrorHandler("Type is Required.", 400));

      if (!req.file) return next(new ErrorHandler("Image is Required.", 400));
      const image = req.file.path;

      const layout: any = await Layout.findOne({
        type,
      });

      if (!layout) {
        const cloud = await v2.uploader.upload(image, { folder: "layout" });
        const newLayout = await Layout.create({
          type,
          image: {
            public_id: cloud.public_id,
            url: cloud.secure_url,
          },
        });
        await redis.set(type, JSON.stringify(newLayout));
        res.status(200).json({
          success: true,
          layout: newLayout,
        });
      } else {
        const public_id = layout.image?.public_id;
        let cloud;
        if (public_id) {
          await v2.uploader.destroy(public_id);
          cloud = await v2.uploader.upload(image, { folder: "layout" });
        } else {
          cloud = await v2.uploader.upload(image, { folder: "layout" });
        }
        layout.image = {
          public_id: cloud.public_id,
          url: cloud.secure_url,
        };
        await layout.save();
        await redis.set(type, JSON.stringify(layout));
        res.status(200).json({
          success: true,
          layout,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateLayout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      if (!type) return next(new ErrorHandler("Type is Required.", 400));

      let layout;
      layout = (await Layout.findOne({ type })) as ILayout;
      if (!layout) {
        return next(new ErrorHandler(`${type} not found.`, 404));
      }

      if (type === "information") {
        const {
          address,
          phoneNumbers,
          workHours: { from, to },
        } = req.body;
        if (address) layout.info.address = address;
        if (from) layout.info.workHours.from = from;
        if (to) layout.info.workHours.to = to;

        if (phoneNumbers) {
          const { add, del, update } = req.body;
          if (add) {
            layout.info.phoneNumbers.push(...phoneNumbers);
          } else if (del) {
            layout.info.phoneNumbers.filter((num) => {
              phoneNumbers.map((ele: any) => num !== ele);
            });
          } else if (update) {
            const { oldNumber, newNumber } = req.body;
            const index = layout.info.phoneNumbers.findIndex(
              (num) => num === oldNumber
            );
            layout.info.phoneNumbers[index] = newNumber;
          }
          await layout.save();
        }

        await layout.save();
      } else {
        layout = await Layout.findOneAndUpdate({ type }, req.body, {
          new: true,
        });
      }

      const allLayouts = await Layout.find();
      await redis.set("layouts", JSON.stringify(allLayouts));

      res.status(200).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const addLayout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      if (!type) return next(new ErrorHandler("Type is Required.", 400));
      let layout;
      layout = await Layout.findOne({ type }, req.body, {
        new: true,
      });

      if (!layout) {
        layout = await Layout.create(req.body);
      }

      const allLayouts = await Layout.find();
      await redis.set("layouts", JSON.stringify(allLayouts));

      res.status(200).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
