const express = require("express");
const mongoose = require("mongoose");
const readline = require("readline");
const { postEvents } = require("./postEvents");
const Scrape = require("./scraper");

require("dotenv").config();

const app = express();
const PORT = 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m40xslu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const url = "http://whats-on-mombasa.com";
const outputPath = "tables.txt";
const selectedIds = [13, 14, 15];

app.use(express.json());

// const askConfirmation = async (eventData) => {
//   return new Promise((resolve) => {
//     const rl = readline.createInterface({
//       input: process.stdin,
//       output: process.stdout,
//     });

//     console.log("\n🔍 Scraped Event Data Preview:");
//     console.log(JSON.stringify(eventData, null, 2).slice(0, 1000) + "...\n"); 

//     rl.question("🚀 Do you want to post the events? (y/n): ", (answer) => {
//       rl.close();
//       resolve(answer.toLowerCase() === "y");
//     });
//   });
// };

const initializeApp = async () => {
  try {
    console.log("\n🔄 Scraping event data...");
    const eventData = await Scrape(url, outputPath, selectedIds);
    console.log("✅ Scraping complete!");

    // const confirm = await askConfirmation(eventData);
    // if (confirm) {
    //   console.log("\n🚀 Posting events to database...");
    // } else {
    //   console.log("❌ Posting canceled by user.");
    // }
    console.log("\n🔍 Scraped Event Data Preview:");
    console.log(JSON.stringify(eventData, null, 2).slice(0, 1000) + "...\n"); 
    await postEvents(eventData);
    console.log("✅ Events successfully posted!");
  } catch (error) {
    console.error("❌ Error during event processing:", error);
  }
};

const connectDB = async () => {
  try {
    app.listen(PORT, () => {
    console.log(`🚀 Server running on port:${PORT}`);
    });

    mongoose.set("strictQuery", true);
    mongoose.connect(uri)
    .then(async () => {
      await initializeApp()
      console.log("DB Connected Successfully...")
    })
    .catch((err) => {
    console.log(err.message);
    });

  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.stack);
    process.exit(1);
  }
};

// Start MongoDB Connection & Initialize App
connectDB();

// Route to trigger posting events from the file
app.post("/upload-events", async (req, res) => {
  try {
    await connectDB();
    res.status(200).json({ success: true, message: "Events uploaded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error uploading events", error: error.message });
  }
});

// Default Route
app.get("/", (req, res) => {
  res.send("Welcome to the Event Scraper");
});
