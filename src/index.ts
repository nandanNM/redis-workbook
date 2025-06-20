import express from "express";
import axios from "axios";

const PORT = 3000;
const app = express();

app.use(express.json());
interface CacheStore {
  totalPageCount?: number;
}
const cacheStore: CacheStore = {};
app.get("/books/total", async (req, res) => {
  try {
    // Check if the totalPageCount is already cached
    if ("totalPageCount" in cacheStore) {
      return res.json({ totalPageCount: cacheStore.totalPageCount });
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
    cacheStore["totalPageCount"] = totalPageCount;
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
