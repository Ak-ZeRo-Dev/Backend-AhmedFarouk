import { Document } from "mongoose";

interface INotification extends Document {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  title: string;
  message: string;
  status: string;
}
