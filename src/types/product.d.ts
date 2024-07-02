import { Document } from "mongoose";

interface IReply extends Document {
  userId?: string;
  email?: string;
  comment: string;
}

interface IReview extends Document {
  userId?: string;
  email?: string;
  rating: number;
  comment: string;
  commentReplies: IReply[];
}

interface IImage extends Document {
  public_id: string;
  url: string;
}
interface IVideo extends Document {
  url: string;
}

interface IProduct extends Document {
  createdBy: { _id: any };
  title: string;
  description: string;
  price: number;
  estimatedPrice?: number;
  categories: string[];
  keywords: string[];
  colors: string[];
  rating: {
    rate: number;
    count: number;
  };
  loveCount: number;
  viewCount: number;
  review: IReview[];
  images: IImage[];
  video: IVideo[];
}
