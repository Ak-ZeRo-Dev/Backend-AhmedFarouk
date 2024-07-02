import mongoose, { Schema, model } from "mongoose";
import { IImage, IProduct, IReply, IReview, IVideo } from "../types/product";
import { User } from "./usersModel";

const replySchema = new Schema<IReply>({
  userId: String,
  email: String,
  comment: String,
});

const reviewSchema = new Schema<IReview>({
  userId: String,
  email: String,
  rating: Number,
  comment: String,
  commentReplies: [replySchema],
});

const imagesSchema = new Schema<IImage>({
  _id: mongoose.Types.ObjectId,
  public_id: String,
  url: String,
});
const videoSchema = new Schema<IVideo>({
  url: String,
});

const productSchema = new Schema<IProduct>({
  createdBy: {
    _id: {
      type: mongoose.Types.ObjectId,
      ref: User,
      required: true,
    },
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  estimatedPrice: Number,
  categories: {
    type: [String],
    required: true,
  },
  keywords: [String],
  viewCount: Number,
  rating: {
    rate: {
      type: Number,
      default: 0,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  loveCount: Number,
  colors: [String],
  review: [reviewSchema],
  images: [imagesSchema],
  video: [videoSchema],
});

export const Product = model<IProduct>("Product", productSchema);
