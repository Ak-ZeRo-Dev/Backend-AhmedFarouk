import mongoose from "mongoose";

export const connectDB = async () => {
  const URI: string = process.env.DB_URI as string;

  await mongoose
    .connect(URI)
    .then((data) => {
      console.log(`Connected Successfully With ${data.connection.name}`);
    })
    .catch((error: any) => {
      console.error(`Failed to connect to the database: ${error.message}`);
      process.exit(1);
    });
};
