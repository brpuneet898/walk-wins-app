const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk-node");

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// This is the main function that will run automatically on a schedule.
// We'll set it to run at the top of every hour.
exports.sendPersonalizedNotifications = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    console.log("Running hourly notification job.");

    const now = new Date();
    const currentHour = now.getHours(); // e.g., 14 for 2 PM
    let timeOfDay = "Morning";
    if (currentHour >= 12 && currentHour < 17) timeOfDay = "Evening";
    if (currentHour >= 17) timeOfDay = "Night";

    // 1. Find all users whose "preferredTime" matches the current time of day.
    const usersSnapshot = await db.collection("users")
      .where("preferredTime", "==", timeOfDay)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users to notify at this time.");
      return null;
    }

    // A list to hold all the notification messages we'll send.
    const messages = [];

    // 2. Loop through each eligible user to create a personalized message.
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;

      // Make sure the user has a valid push token.
      if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
        console.log(`User ${user.username} has an invalid token. Skipping.`);
        continue;
      }

      // 3. Get today's step count for the user.
      const todayString = new Date().toISOString().split("T")[0];
      const dailyStepsDoc = await db.collection("users").doc(userId)
          .collection("dailySteps").doc(todayString).get();
      const todaysSteps = dailyStepsDoc.exists ?
        dailyStepsDoc.data().steps : 0;
      const stepsToGo = user.dailyStepGoal - todaysSteps;

      // 4. Construct a detailed prompt for the Gemini AI.
      const prompt = `
        System Prompt: You are a friendly and motivating fitness coach for an Indian walking app called "WalkWins". Generate a short, engaging push notification (under 25 words) for a user. Be creative and personal.

        User Details:
        - Name: ${user.username}
        - Age: ${user.age}
        - Gender: ${user.gender}
        - Fitness Goal: ${user.fitnessGoal}
        - Occupation: ${user.occupation}

        User's Progress Today:
        - Steps Taken Today: ${todaysSteps}
        - Daily Step Goal: ${user.dailyStepGoal}
        - Steps Remaining to Goal: ${stepsToGo}

        Task: Write a personalized push notification.
        - If the user is close to their goal, motivate them to finish.
        - If they haven't walked much, gently encourage them to start.
        - Mention their name sometimes.
        - Keep it relevant to an Indian audience.
        - DO NOT include greetings like "Hi" or "Hello".

        Example 1: Hey ${user.username}, just ${stepsToGo} more steps to smash your daily goal! You can do it!
        Example 2: A perfect ${timeOfDay} for a walk, ${user.username}! Let's start working on your ${user.fitnessGoal} goal.
        Example 3: Just a quick stroll is all it takes to get closer to your goal today!

        Generated Notification:
      `;

      // 5. Call the Gemini API to get the notification message.
      const notificationMessage = await generateNotification(prompt);

      // 6. Add the generated message to our list of notifications to send.
      messages.push({
        to: user.pushToken,
        sound: "default",
        title: "WalkWins Reminder 🚶",
        body: notificationMessage,
      });
    }

    // 7. Send all the notifications at once.
    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
          console.log("Sent notification chunk successfully.");
        } catch (error) {
          console.error("Error sending push notification chunk:", error);
        }
      }
    }

    return null;
  });


// Helper function to call the Gemini API
async function generateNotification(prompt) {
  const GEMINI_API_KEY = functions.config().gemini.key;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: 50, // Limit the length of the response
        },
      }),
    });
    if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
    }
    const data = await response.json();
    const message = data.candidates[0].content.parts[0].text.trim();
    return message;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Return a fallback message if the AI fails
    return "Time for a refreshing walk!";
  }
}