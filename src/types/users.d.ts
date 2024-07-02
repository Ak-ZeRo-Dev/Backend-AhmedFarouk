import { Document } from "mongoose";

type image = {
  public_id: string;
  url: string;
};

interface IUser extends Document {
  _id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  gender: string;
  isVerified: boolean;
  isBlocked: boolean;
  blockCount: number;
  accessToken: string;
  avatar: image;
  background: image;
  love: string[];
  createdProducts: Array<{
    _id: string;
  }>;
  comparePassword: (password: string) => Promise<boolean>;
  generateAccessToken: () => string;
  generateRefreshToken: () => string;
}

interface IDecoded {
  _id: string;
}

type IRegister = {
  name: string;
  email: string;
  password: string;
};

type IActivation = {
  token: string;
  activationCode: string;
};

type ILogin = {
  email: string;
  password: string;
};

type ITokenOptions = {
  expire: Date;
  maxAge: number;
  httpOnly: boolean;
  signed: boolean;
  secure?: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
};
