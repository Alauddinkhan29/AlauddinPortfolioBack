// const express = require('express');
// const router = express.Router();
// // const nodemailer = require('nodemailer');
// // const redisClient = require('../Clients/RedicClients');
// // require and support .default fallback (some bundlers)
// const RawParser = require('rss-parser');
// const Parser = RawParser.default || RawParser;
// const parser = new Parser();

// // API route to fetch Medium articles
// router.get("/api/articles", async (req, res) => {
//     console.log("==== here")
//     try {
//         const feed = await parser.parseURL("https://medium.com/feed/@alauddinkhan29");

//         console.log("=== feed", feed)
//         const articles = feed.items.map(item => ({
//             title: item.title,
//             link: item.link,
//             pubDate: item.pubDate,
//             categories: item.categories,
//             contentSnippet: item.contentSnippet
//         }));

//         res.json(articles);
//     } catch (error) {
//         console.log("==== error in articles", error)
//         console.error("Error fetching Medium articles:", error);
//         res.status(500).json({ error: "Failed to fetch articles" });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const Parser = require('rss-parser'); // Make sure rss-parser is installed
const parser = new Parser();
// const redisClient = require('../Clients/RedicClients'); // your redis client

// API route to fetch Medium articles with caching
router.get("/api/articles", async (req, res) => {
    try {
        const cacheKey = "medium_articles";

        // 1. Check cache first
        // const cachedArticles = await redisClient.get(cacheKey);
        // if (cachedArticles) {
        //     console.log("✅ Returning cached articles");
        //     return res.json(JSON.parse(cachedArticles));
        // }

        // 2. Fetch from Medium if cache miss
        const feed = await parser.parseURL("https://medium.com/feed/@alauddinkhan29");

        const articles = feed.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            categories: item.categories,
            contentSnippet: item.contentSnippet
        }));

        // 3. Save in Redis (set TTL = 600 seconds = 10 minutes)
        // await redisClient.setEx(cacheKey, 600, JSON.stringify(articles));

        console.log("📡 Fetched fresh articles from Medium");
        res.json(articles);

    } catch (error) {
        console.error("❌ Error fetching Medium articles:", error);
        res.status(500).json({ error: "Failed to fetch articles" });
    }
});

module.exports = router;
