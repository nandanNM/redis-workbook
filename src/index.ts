import express from "express";
import "dotenv/config";
import axios from "axios";
import Redis from "ioredis";
const PORT = process.env.PORT ?? 8000;
const app = express();
const redis = new Redis({
  host: "localhost",
  port: Number(6379),
});
app.use(express.json());
interface CacheStore {
  totalPageCount?: number;
}
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
    await redis.set("totalPageValue", JSON.stringify(totalPageCount)); // Cache for 1 hour
    res.json({ totalPageCount });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/", (req, res) => {
  res.send("Hello World! Welcome to my Express server.");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
