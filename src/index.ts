import express from "express";
import "dotenv/config";
import axios from "axios";
import Redis from "ioredis";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT ?? 8000;
const app = express();
const httpServer = http.createServer(app);
const io = new Server();
io.attach(httpServer);

const redis = new Redis({
  host: "localhost",
  port: Number(6379),
});
app.use(express.json());
interface CacheStore {
  totalPageCount?: number;
}

app.use(async (req, res, next) => {
  const key = "rate-limit";
  const value = await redis.get(key);
  if (value === null) {
    await redis.set(key, 0);
    await redis.expire(key, 60); // Set expiration to 60 seconds
  }
  if (Number(value) >= 10) {
    return res.status(429).send("Rate limit exceeded. Try again later.");
  }
  await redis.incr(key);
  next();
});

io.on("connection", (socket) => {
  console.log(`a user connected ${socket.id}`);
});

app.use(express.static("./public"));

const cacheStore: CacheStore = {};
app.get("/books/total", async (req, res) => {
  try {
    // Check if the totalPageCount is already cached
    const cachedValue = await redis.get("totalPageValue");
    if (cachedValue) {
      return res.json({ totalPageCount: Number(cachedValue) });
    }
    const response = await axios.get(
      "https://api.freeapi.app/api/v1/public/books"
    );
    const totalPageCount = response?.data?.data?.data?.reduce(
      (acc: number, curr: { volumeInfo?: { pageCount: number } }) =>
        curr.volumeInfo?.pageCount ? curr.volumeInfo.pageCount + acc : 0,
      0
    );
    // Cache the totalPageCount
    // cacheStore["totalPageCount"] = totalPageCount;
    await redis.set("totalPageValue", JSON.stringify(totalPageCount), "EX", 60);
    res.json({ totalPageCount });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/", (req, res) => {
  res.send("Hello World! Welcome to my Express server.");
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
