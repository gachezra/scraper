const Events = require("./eventsModel");
const { parse, format } = require("date-fns");
const mongoose = require("mongoose");

// Function to process event data
const processEventData = (dateString, eventData) => {
  try {
    console.log("Processing event data:", eventData);

    const formattedDate = format(
      parse(dateString + " 2025", "EEEE do MMMM yyyy", new Date()),
      "yyyy-MM-dd"
    );

    const userId = new mongoose.Types.ObjectId("000000000000000000000001");

    return {
      title: eventData.description?.trim() || "Untitled Event",
      description: eventData.description?.trim() || "No description available",
      date: formattedDate,
      location: eventData.description?.split("\n")[0].trim() || "Unknown location",
      user: userId,
      image: eventData.links?.length > 0 ? eventData.links[0].href : null,
      isPaid: false,
      ticketPrice: 0,
    };
  } catch (error) {
    console.error("Error processing event data:", error);
    throw new Error("Invalid event data");
  }
};

// Function to post a single event
const postSingleEvent = async (dateString, eventData) => {
  try {
    const processedEvent = processEventData(dateString, eventData);
    const event = new Events(processedEvent);
    console.log("Saving event:", event);
    return await event.save();
  } catch (error) {
    console.error(`Error posting event '${eventData.description}':`, error);
    throw error;
  }
};

// Function to process and post all events
const postEvents = async (eventData) => {
  try {
    const results = [];
    const errors = [];
    
    if (!eventData || typeof eventData !== "object") {
      throw new Error("Invalid event data format. Expected an object.");
    }

    for (const [date, events] of Object.entries(eventData)) {
      if (!Array.isArray(events)) {
        console.warn(`Skipping invalid event list for date: ${date}`);
        continue;
      }

      for (const event of events) {
        try {
          const newEvent = await postSingleEvent(date, event);
          results.push(newEvent);
        } catch (error) {
          errors.push({
            title: event.description || "Unknown event",
            error: error.message,
          });
        }
      }
    }

    console.log({
      success: true,
      data: {
        succeeded: results,
        failed: errors,
      },
      totalProcessed: results.length + errors.length,
      successCount: results.length,
      errorCount: errors.length,
    });
  } catch (error) {
    console.error("Error in postEvents:", error);
  }
};

module.exports = {
  postEvents,
};
