import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { Secret } from "jsonwebtoken";
import { IUser } from "../types/users";

const emailRegex: RegExp = /^[^\s@]+@[^\s@].[^\s@]+$/;
const passwordRegex: RegExp =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\\!@#$%^&*()_+=/|-]).{8,24}$/;
const phoneRegex: RegExp = /^(\+?)[0-9]{11,}$/;

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      min: [3, "Minimum Character Is 3"],
      required: [true, "Name  is required"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email  is required"],
      validate: {
        validator: (value: string) => {
          return emailRegex.test(value);
        },
        message: "Invalid Email",
      },
    },
    password: {
      type: String,
      select: false,
      min: [6, "Password must be at least 6 character"],
      validate: {
        validator: (value: string) => {
          return passwordRegex.test(value);
        },
        message: "Invalid Password",
      },
    },
    avatar: {
      type: Schema.Types.Mixed,
      default: {
        public_id: "avatar/tifgv3eltnjhzcaleqqh",
        url: "https://res.cloudinary.com/dvtnjrfsk/image/upload/v1713926683/avatar/tifgv3eltnjhzcaleqqh.png",
      },
    },
    role: {
      type: String,
      default: "user",
    },
    gender: {
      type: String,
    },
    phone: {
      type: String,
      validate: {
        validator: (value: string) => {
          return phoneRegex.test(value);
        },
        message: "Invalid Phone",
      },
    },
    love: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Product",
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockCount: {
      type: Number,
      default: 0,
    },
    accessToken: {
      type: String,
    },
    createdProducts: [
      {
        _id: String,
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) next();

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_ACCESS_KEY as Secret, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_REFRESH_KEY as Secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });
};

export const User = model<IUser>("User", userSchema);
