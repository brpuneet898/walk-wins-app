# 🤖 Pookie Notifications Setup & Testing Guide

## What We Built
AI-powered personalized notifications that create cute, motivational messages based on each user's profile and walking progress.

## 🚀 Setup Steps

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure Firebase Environment
```bash
# Navigate to backend directory
cd backend

# Set the Gemini API key in Firebase
firebase functions:config:set gemini.api_key="YOUR_API_KEY_HERE"

# Deploy the functions
firebase deploy --only functions
```

### 3. Update Function URL
In `frontend/app/(tabs)/notification-test.tsx`, update line 15 with your actual Firebase function URL:
```typescript
const response = await fetch('https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/sendPookieNotifications', {
```

Find your URL format:
- Project ID: `walkwins-4c968` (from your firebaseConfig.js)
- Region: Usually `us-central1` (default)
- So URL should be: `https://us-central1-walkwins-4c968.cloudfunctions.net/sendPookieNotifications`

## 🧪 How to Test

### Method 1: In-App Testing
1. Open your app
2. Go to Profile tab
3. Tap "Test Pookie Notifications" (purple button)
4. Check the response message
5. Look for notifications on your device!

### Method 2: Direct HTTP Test
```bash
curl -X POST https://us-central1-walkwins-4c968.cloudfunctions.net/sendPookieNotifications
```

### Method 3: Firebase Console
1. Go to Firebase Console → Functions
2. Find `sendPookieNotifications`
3. Click to trigger manually

## 📱 What the AI Creates
The AI generates personalized messages like:
- "Hey Sarah! 💚 Just 500 more steps and you'll crush today's goal! Your marketing brain needs those creative walks! 🚶‍♀️💡"
- "Yasss Alex! 🎉 You smashed your goal! This engineer knows how to debug AND walk! 👩‍💻🔥"
- "Morning sunshine! ☀️ Time to get those steps in, pookie! 💪"

## ⏰ Automatic Scheduling
Notifications automatically send at:
- **9:00 AM** - Morning users (based on preferredTime)
- **12:00 PM** - Random 20% of users  
- **3:00 PM** - Random 20% of users
- **6:00 PM** - Evening users (based on preferredTime)
- **9:00 PM** - Random 20% of users

## 🔧 Troubleshooting

### No notifications received?
1. Check if you have notification permissions
2. Verify push token is saved to user profile
3. Make sure PushNotificationManager is active
4. Check Firebase function logs

### AI messages not generating?
1. Verify Gemini API key is set correctly
2. Check function logs for API errors
3. Fallback messages should still work

### Function not triggering?
1. Make sure functions are deployed
2. Check the function URL is correct
3. Verify network connectivity

## 🎯 Next Steps
1. Test with multiple users
2. Monitor notification delivery rates
3. Adjust scheduling times based on user feedback
4. Add more personality variations to AI prompts
5. Consider adding user feedback on notification quality

## 🔍 Monitoring
- Check Firebase Functions logs for errors
- Monitor user engagement with notifications
- Track notification delivery success rates
- Gather user feedback on message quality

---

**Happy Testing! 🎉** Your users are about to get some very cute and motivational notifications!
