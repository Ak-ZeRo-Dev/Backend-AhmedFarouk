import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../../middlewares/catchAsyncErrors";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { Product } from "../../models/productsModel";
import { redis } from "../../config/redis";
import { sendMail } from "../../utils/sendMail";
import { User } from "../../models/usersModel";
import { IProduct } from "../../types/product";
import mongoose from "mongoose";

export const getAllProducts = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, limit: limitData, page: pageData }: any = req.query;
      const limit: number = Number(limitData) || 20;
      const page = Number(pageData) || 1;
      const skip: number = (page - 1) * limit;

      let criteria: any = {};
      if (search) {
        const searchRegex = new RegExp(search, "i");
        criteria.$or = [
          { title: searchRegex },
          { categories: searchRegex },
          { keywords: searchRegex },
        ];
        if (mongoose.Types.ObjectId.isValid(search)) {
          criteria.$or.push({ _id: search });
        }
      }

      const products = await Product.find(criteria)
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

      const totalCount = await Product.countDocuments(criteria);

      if (products.length === 0 || totalCount === 0 || !products) {
        return next(new ErrorHandler("No Products Found!", 404));
      }

      res.status(200).json({
        success: true,
        products,
        totalCount,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getProduct = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      let product: IProduct | undefined | null;

      const productJson = await redis.get(productId);

      if (productJson) {
        product = JSON.parse(productJson);
      } else {
        product = await Product.findByIdAndUpdate(productId, {
          $inc: { viewCount: 1 },
        });
        if (product && product.viewCount > 50) {
          await redis.set(productId, JSON.stringify(product));
        }
      }

      if (!product) {
        return next(new ErrorHandler("Product Not Found!", 404));
      }

      res.status(200).json({
        success: true,
        product,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const addProduct = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title } = req.body;

      const { _id } = req.user;

      const productData = {
        cratedBy: _id,
        ...req.body,
      };

      const product = await Product.create(productData);
      await redis.set(product._id, JSON.stringify(productData));

      try {
        const data = {
          title,
          productId: product._id,
          createdBy: req.user._id,
        };

        const email = process.env.SMTP_MAIL as string;
        // todo create ejs file
        await sendMail({
          email,
          subject: "Created new product",
          template: "/products/newProduct.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      res.status(201).json({
        success: true,
        product,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const editProduct = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user;
      const { productId } = req.params;

      const oldProduct =
        JSON.parse((await redis.get(productId)) as string) ||
        (await Product.findById(productId));

      if (!oldProduct) return next(new ErrorHandler("Product Not Found.", 404));

      const product = await Product.findByIdAndUpdate(productId, req.body, {
        new: true,
      });
      if (!product) return next(new ErrorHandler("Product Not Found.", 404));

      await redis.set(productId, JSON.stringify(product));

      const user =
        JSON.parse((await redis.get(_id)) as string) ||
        (await User.findById(_id));
      try {
        const data = {
          editedBy: user?.name,
          email: user?.email,
          product: product.title,
          productId: product._id,
          oldProductData: oldProduct,
          newProductData: product,
        };
        const email = process.env.SMTP_MAIL as string;
        // todo create ejs file
        await sendMail({
          email,
          subject: "Edited a product",
          template: "/products/editProduct.ejs",
          data,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// todo send email
export const deleteProduct = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { products }: { products: { _id: string }[] } = req.body;
      const failedIds: { _id: string }[] = [];

      await Promise.all(
        products.map(async (product: { _id: string }) => {
          try {
            const id = product._id;
            await Product.findByIdAndDelete(id);
          } catch (error: any) {
            failedIds.push(product);
          }
        })
      );

      if (failedIds.length > 0) {
        return next(
          new ErrorHandler(
            `Failed to delete products with IDs: ${failedIds.join(", ")}`,
            400
          )
        );
      }

      await redis.del("products");

      res.status(200).json({ message: "Products deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
