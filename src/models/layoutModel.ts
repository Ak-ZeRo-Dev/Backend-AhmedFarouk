import { Schema, model } from "mongoose";
import { IAbout, IFAQ, IInfo, ILayout, ISocial } from "../types/layout";

const faqSchema = new Schema<IFAQ>({
  question: String,
  answer: String,
});

const socialSchema = new Schema<ISocial>({
  type: String,
  url: {
    type: String,
    default: "/",
  },
});
const infoSchema = new Schema<IInfo>({
  address: String,
  phoneNumbers: [String],
  workHours: {
    type: {
      from: String,
      to: String,
    },
  },
});
const imageSchema = new Schema({
  public_id: String,
  url: String,
});

const aboutSchema = new Schema<IAbout>({
  address: {
    type: {
      lat: Number,
      lng: Number,
    },
  },
  images: [imageSchema],
  messages: {
    type: {
      definition: String,
      mission: String,
      address: String,
    },
  },
});
const layoutSchema = new Schema<ILayout>(
  {
    type: {
      type: String,
      required: true,
    },
    login: imageSchema,
    register: imageSchema,
    verification: imageSchema,
    contactUs: imageSchema,
    userBackground: imageSchema,
    logo: {
      text: String,
      image: imageSchema,
    },
    categories: [String],
    faq: [faqSchema],
    info: infoSchema,
    social: [socialSchema],
    about: aboutSchema,
  },
  { timestamps: true }
);

export const Layout = model<ILayout>("Layout", layoutSchema);
