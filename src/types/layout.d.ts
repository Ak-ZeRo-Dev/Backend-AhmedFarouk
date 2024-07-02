import { Document } from "mongoose";

interface IFAQ extends Document {
  question: string;
  answer: string;
}

interface ISocial extends Document {
  type: string;
  url?: string;
}
interface IImage extends Document {
  public_id: string;
  url: string;
}
interface IContact extends Document {
  name: string;
  phoneNumber: string;
  email: string;
  message: string;
}
interface IInfo extends Document {
  address: string;
  phoneNumbers: string[];
  workHours: {
    from: string;
    to: string;
  };
}
interface IAbout extends Document {
  address: {
    lat: number;
    lng: number;
  };
  images: IImage[];
  messages: {
    definition: string;
    mission: string;
    address: string;
  };
}

interface ILayout extends Document {
  type: string;
  faq: IFAQ[];
  categories: string[];
  contact: IContact[];
  info: IInfo;
  social: ISocial[];
  logo: {
    text: string;
    image: IImage;
  };
  login: IImage;
  register: IImage;
  verification: IImage;
  contactUs: IImage;
  userBackground: IImage;
  about: IAbout;
}
