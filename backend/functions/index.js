const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple test function
exports.testFunction = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase Functions!");
});

// 🧪 MANUAL TEST: Immediate notification test
exports.testNotificationNow = onRequest({
  cors: true,
  invoker: "public"
}, async (req, res) => {
  console.log("🧪 Testing notification immediately...");
  
  try {
    // Get all users with push tokens (including mock tokens for testing)
    const usersSnapshot = await db.collection("users")
      .where("pushToken", "!=", null)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users with push tokens found for test.");
      return res.send("No users to notify");
    }

    const messages = [];
    let processedUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userProfile = userDoc.data();
      const userId = userDoc.id;

      // For testing, accept both real tokens and mock tokens
      const isRealToken = Expo.isExpoPushToken(userProfile.pushToken);
      const isMockToken = userProfile.pushToken && userProfile.pushToken.startsWith('ExpoMockToken');
      
      if (!isRealToken && !isMockToken) {
        console.log(`User ${userProfile.username} has invalid token. Skipping.`);
        continue;
      }

      // Get current time for the test message
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      
      const testMessage = `🧪 Hey ${userProfile.username || 'pookie'}! Immediate test at ${timeString}! Your notifications work! 💚✨`;

      // Only send to real tokens, log mock tokens
      if (isRealToken) {
        messages.push({
          to: userProfile.pushToken,
          sound: "default",
          title: "🧪 WalkWins Immediate Test",
          body: testMessage,
          data: { 
            type: "immediate_test",
            userId: userId,
            testTime: timeString
          },
        });
      } else if (isMockToken) {
        console.log(`🧪 Would send to ${userProfile.username} with mock token: "${testMessage}"`);
      }

      processedUsers++;
    }

    // Send notifications in batches
    let sentNotifications = 0;
    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const receipts = await expo.sendPushNotificationsAsync(chunk);
          console.log("📤 Sent immediate test notification chunk:", receipts);
          sentNotifications += chunk.length;
        } catch (error) {
          console.error("❌ Error sending immediate test notification chunk:", error);
        }
      }
    }

    const summary = `🧪 Immediate test complete! Processed: ${processedUsers} users, Sent: ${sentNotifications} real notifications, Mock users: ${processedUsers - sentNotifications}`;
    console.log(summary);
    res.send(summary);

  } catch (error) {
    console.error("💥 Error in immediate test:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// 🚀 PRODUCTION FUNCTION: Send AI-powered Pookie Notifications
exports.sendPookieNotifications = onRequest({
  cors: true,
  invoker: "private" // Only callable by Firebase services
}, async (req, res) => {
  console.log("🤖 Starting AI-powered pookie notifications...");
  
  try {
    // Get all users with push tokens and complete profiles
    const usersSnapshot = await db.collection("users")
      .where("pushToken", "!=", null)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users with push tokens found.");
      return res.send("No users to notify");
    }

    const messages = [];
    let processedUsers = 0;
    let aiGeneratedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userProfile = userDoc.data();
      const userId = userDoc.id;

      // Only process users with valid Expo push tokens
      if (!userProfile.pushToken || !Expo.isExpoPushToken(userProfile.pushToken)) {
        console.log(`User ${userProfile.username} has invalid token. Skipping.`);
        continue;
      }

      try {
        // Get user's latest step data
        const today = new Date().toISOString().split('T')[0];
        const dailyStepDoc = await db.doc(`users/${userId}/dailySteps/${today}`).get();
        const todaySteps = dailyStepDoc.exists() ? dailyStepDoc.data().steps || 0 : 0;

        // Create prompt for Gemini AI
        const prompt = `Create a cute, motivational, and personalized push notification message for a fitness app user. 

User Details:
- Name: ${userProfile.username || 'there'}
- Age: ${userProfile.age || 'unknown'}
- Gender: ${userProfile.gender || 'unknown'}
- Daily step goal: ${userProfile.dailyStepGoal || 10000}
- Steps today: ${todaySteps}
- Fitness goal: ${userProfile.fitnessGoal || 'stay healthy'}
- Occupation: ${userProfile.occupationType || 'busy professional'}
- Preferred notification time: ${userProfile.preferredNotificationTime || 'anytime'}

Guidelines:
- Keep it under 100 characters
- Make it cute and encouraging (use "pookie" sometimes)
- Be specific to their progress and goals
- Use emojis appropriately
- Make it feel personal and motivating
- If they're close to their goal, encourage them to finish
- If they're behind, gently motivate them without being pushy

Return only the notification message, nothing else.`;

        // Generate AI message
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const aiMessage = result.response.text().trim();
        
        console.log(`✨ Generated AI message for ${userProfile.username}: ${aiMessage}`);
        
        messages.push({
          to: userProfile.pushToken,
          sound: "default",
          title: "WalkWins 💚",
          body: aiMessage,
          data: { 
            type: "pookie_notification",
            userId: userId,
            stepsToday: todaySteps,
            aiGenerated: true
          },
        });

        aiGeneratedCount++;

      } catch (aiError) {
        console.error(`❌ AI generation failed for user ${userProfile.username}:`, aiError);
        
        // Fallback to generic motivational message
        const fallbackMessages = [
          `Hey ${userProfile.username}! 💚 Time to take some steps, pookie! Your fitness journey awaits! 🚶‍♀️✨`,
          `${userProfile.username}, you've got this! 💪 Every step counts towards your goal! Keep walking! 🎉`,
          `Pookie alert! 🚨 ${userProfile.username}, your legs are calling for some movement! Let's go! 🏃‍♀️💨`,
          `${userProfile.username}! 🌟 Turn those steps into achievements today! You're amazing! 💚🚶‍♀️`,
          `Walking time, ${userProfile.username}! 🚶‍♀️ Your future self will thank you for every step! ✨💪`
        ];
        
        const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
        
        messages.push({
          to: userProfile.pushToken,
          sound: "default",
          title: "WalkWins 💚",
          body: randomMessage,
          data: { 
            type: "pookie_notification",
            userId: userId,
            stepsToday: todaySteps,
            aiGenerated: false
          },
        });
      }

      processedUsers++;
    }

    // Send notifications in batches
    let sentNotifications = 0;
    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const receipts = await expo.sendPushNotificationsAsync(chunk);
          console.log("📤 Sent notification chunk:", receipts);
          sentNotifications += chunk.length;
        } catch (error) {
          console.error("❌ Error sending push notification chunk:", error);
        }
      }
    }

    const summary = `🎉 Pookie notifications complete! Processed: ${processedUsers} users, AI generated: ${aiGeneratedCount}, Sent: ${sentNotifications} notifications`;
    console.log(summary);
    res.send(summary);

  } catch (error) {
    console.error("💥 Error in pookie notifications:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// 📅 SCHEDULED FUNCTIONS: Automatic Daily Notifications
// Morning motivation (9 AM)
exports.morningPookieNotifications = onSchedule("0 9 * * *", async (event) => {
  console.log("🌅 Running morning pookie notifications...");
  return await sendNotificationsToGroup("morning");
});

// Lunch time boost (12 PM)
exports.lunchPookieNotifications = onSchedule("0 12 * * *", async (event) => {
  console.log("🍽️ Running lunch time pookie notifications...");
  return await sendNotificationsToGroup("lunch");
});

// Afternoon reminder (3 PM)
exports.afternoonPookieNotifications = onSchedule("0 15 * * *", async (event) => {
  console.log("☀️ Running afternoon pookie notifications...");
  return await sendNotificationsToGroup("afternoon");
});

// Evening motivation (6 PM)
exports.eveningPookieNotifications = onSchedule("0 18 * * *", async (event) => {
  console.log("🌆 Running evening pookie notifications...");
  return await sendNotificationsToGroup("evening");
});

// Night gentle reminder (9 PM)
exports.nightPookieNotifications = onSchedule("0 21 * * *", async (event) => {
  console.log("🌙 Running night pookie notifications...");
  return await sendNotificationsToGroup("night");
});

// 🧪 TEMPORARY TEST FUNCTION: 3:05 AM notification test
exports.testEarlyMorningNotification = onSchedule("5 3 * * *", async (event) => {
  console.log("🧪 Running 3:05 AM test notification...");
  
  try {
    // Get all users with push tokens (including mock tokens for testing)
    const usersSnapshot = await db.collection("users")
      .where("pushToken", "!=", null)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users with push tokens found for test.");
      return { success: false, message: "No users to notify" };
    }

    const messages = [];
    let processedUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userProfile = userDoc.data();
      const userId = userDoc.id;

      // For testing, accept both real tokens and mock tokens
      const isRealToken = Expo.isExpoPushToken(userProfile.pushToken);
      const isMockToken = userProfile.pushToken && userProfile.pushToken.startsWith('ExpoMockToken');
      
      if (!isRealToken && !isMockToken) {
        console.log(`User ${userProfile.username} has invalid token. Skipping.`);
        continue;
      }

      try {
        // Get user's current step data
        const today = new Date().toISOString().split('T')[0];
        const dailyStepDoc = await db.doc(`users/${userId}/dailySteps/${today}`).get();
        const todaySteps = dailyStepDoc.exists() ? dailyStepDoc.data().steps || 0 : 0;

        // Create test prompt for 3:05 AM
        const prompt = `Create a cute, motivational push notification for a fitness app user for a 3:05 AM test notification.

User Details:
- Name: ${userProfile.username || 'there'}
- Steps today: ${todaySteps}
- Daily goal: ${userProfile.dailyStepGoal || 10000}

Guidelines:
- Keep it under 100 characters
- Make it a cute test message mentioning it's 3:05 AM
- Use "pookie" and mention this is a test
- Include emojis
- Make it encouraging

Return only the notification message.`;

        // Generate AI message
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const aiMessage = result.response.text().trim();

        // Only send to real tokens, log mock tokens
        if (isRealToken) {
          messages.push({
            to: userProfile.pushToken,
            sound: "default",
            title: "🧪 WalkWins Test (3:05 AM)",
            body: aiMessage,
            data: { 
              type: "test_early_morning",
              userId: userId,
              testTime: "3:05 AM",
              stepsToday: todaySteps
            },
          });
        } else if (isMockToken) {
          console.log(`🧪 Would send to ${userProfile.username} with mock token: "${aiMessage}"`);
        }

      } catch (aiError) {
        console.error(`❌ AI generation failed for user ${userProfile.username}:`, aiError);
        
        // Fallback message for testing
        const testMessage = `Hey ${userProfile.username}! 🧪 It's 3:05 AM test time, pookie! This notification system works! 💚✨`;
        
        if (isRealToken) {
          messages.push({
            to: userProfile.pushToken,
            sound: "default",
            title: "🧪 WalkWins Test (3:05 AM)",
            body: testMessage,
            data: { 
              type: "test_early_morning",
              userId: userId,
              testTime: "3:05 AM",
              aiGenerated: false
            },
          });
        } else if (isMockToken) {
          console.log(`🧪 Would send to ${userProfile.username} with mock token: "${testMessage}"`);
        }
      }

      processedUsers++;
    }

    // Send notifications in batches
    let sentNotifications = 0;
    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const receipts = await expo.sendPushNotificationsAsync(chunk);
          console.log("📤 Sent 3:05 AM test notification chunk:", receipts);
          sentNotifications += chunk.length;
        } catch (error) {
          console.error("❌ Error sending 3:05 AM test notification chunk:", error);
        }
      }
    }

    const summary = `🧪 3:05 AM test complete! Processed: ${processedUsers} users, Sent: ${sentNotifications} real notifications, Mock users: ${processedUsers - sentNotifications}`;
    console.log(summary);
    return { success: true, message: summary };

  } catch (error) {
    console.error("💥 Error in 3:05 AM test:", error);
    return { success: false, message: error.message };
  }
});

// Helper function for scheduled notifications
async function sendNotificationsToGroup(timeOfDay) {
  try {
    // Get users who prefer this time or have no preference
    const usersSnapshot = await db.collection("users")
      .where("pushToken", "!=", null)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users with push tokens found.");
      return { success: false, message: "No users to notify" };
    }

    const messages = [];
    let processedUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userProfile = userDoc.data();
      const userId = userDoc.id;

      // Only process users with valid Expo push tokens
      if (!userProfile.pushToken || !Expo.isExpoPushToken(userProfile.pushToken)) {
        continue;
      }

      // Check if user wants notifications at this time
      const userPreferredTime = userProfile.preferredNotificationTime || 'anytime';
      const shouldNotify = userPreferredTime === 'anytime' || 
                          userPreferredTime === timeOfDay ||
                          (timeOfDay === 'morning' && Math.random() < 0.3) || // 30% get morning notifications
                          (timeOfDay === 'evening' && Math.random() < 0.4) || // 40% get evening notifications
                          (Math.random() < 0.2); // 20% random selection for other times

      if (!shouldNotify) continue;

      try {
        // Get user's latest step data
        const today = new Date().toISOString().split('T')[0];
        const dailyStepDoc = await db.doc(`users/${userId}/dailySteps/${today}`).get();
        const todaySteps = dailyStepDoc.exists() ? dailyStepDoc.data().steps || 0 : 0;

        // Create time-specific prompt
        const timePrompts = {
          morning: "morning motivation to start their day with energy",
          lunch: "midday encouragement to stay active during lunch break", 
          afternoon: "afternoon boost to combat the slump and get moving",
          evening: "evening motivation to finish strong and reach their goals",
          night: "gentle evening reminder about tomorrow's opportunities"
        };

        const prompt = `Create a cute, motivational push notification for a fitness app user focused on ${timePrompts[timeOfDay]}.

User Details:
- Name: ${userProfile.username || 'there'}
- Steps today: ${todaySteps}
- Daily goal: ${userProfile.dailyStepGoal || 10000}
- Fitness goal: ${userProfile.fitnessGoal || 'stay healthy'}
- Time of day: ${timeOfDay}

Guidelines:
- Keep it under 100 characters
- Make it ${timeOfDay}-appropriate and cute
- Use "pookie" occasionally 
- Include relevant emojis
- Be encouraging about their current progress
- Make it feel personal

Return only the notification message.`;

        // Generate AI message
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const aiMessage = result.response.text().trim();
        
        messages.push({
          to: userProfile.pushToken,
          sound: "default",
          title: `WalkWins ${timeOfDay === 'morning' ? '🌅' : timeOfDay === 'lunch' ? '🍽️' : timeOfDay === 'afternoon' ? '☀️' : timeOfDay === 'evening' ? '🌆' : '🌙'}`,
          body: aiMessage,
          data: { 
            type: "scheduled_pookie",
            userId: userId,
            timeOfDay: timeOfDay,
            stepsToday: todaySteps
          },
        });

      } catch (aiError) {
        console.error(`❌ AI generation failed for user ${userProfile.username}:`, aiError);
        // Skip this user rather than send generic message for scheduled notifications
        continue;
      }

      processedUsers++;
    }

    // Send notifications in batches
    let sentNotifications = 0;
    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const receipts = await expo.sendPushNotificationsAsync(chunk);
          console.log(`📤 Sent ${timeOfDay} notification chunk:`, receipts);
          sentNotifications += chunk.length;
        } catch (error) {
          console.error("❌ Error sending push notification chunk:", error);
        }
      }
    }

    const summary = `🎉 ${timeOfDay} notifications complete! Processed: ${processedUsers} users, Sent: ${sentNotifications} notifications`;
    console.log(summary);
    return { success: true, message: summary };

  } catch (error) {
    console.error(`💥 Error in ${timeOfDay} notifications:`, error);
    return { success: false, message: error.message };
  }
}
