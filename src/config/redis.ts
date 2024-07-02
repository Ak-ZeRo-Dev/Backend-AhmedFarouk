import { config } from "dotenv";
import Redis from "ioredis";

config({
  path: `${__dirname}/.env`,
});

const redisClient = () => {
  const URL: string = process.env.REDIS_URL as string;

  if (URL) {
    return URL;
  } else {
    throw new Error("Redis connection failed");
  }
};

export const redis = new Redis(redisClient());
