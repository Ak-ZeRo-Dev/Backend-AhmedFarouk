import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { cloudinary } from "./config/cloudinary";
import { app } from "./app";

// Check environment
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: `${__dirname}/config/.env` });
}

const port: number = Number(process.env.PORT) || 6000;

// Connect to the database before starting the server
connectDB().then(() => {
  // Connect to cloudinary
  cloudinary();

  // Create server
  const server = app.listen(port, () => {
    console.log(`Server running successfully at "http://localhost:${port}"`);
  });

  // Handling uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error(`Error: ${error.message}`);
    console.error("Shutting down the server due to an uncaught exception");
    server.close(() => {
      process.exit(1);
    });
  });

  // Handling unhandled promise rejections
  process.on("unhandledRejection", (error: any) => {
    console.error(`Error: ${error.message}`);
    console.error(
      "Shutting down the server due to an unhandled promise rejection"
    );
    server.close(() => {
      process.exit(1);
    });
  });
});
