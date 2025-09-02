# Setting up Gemini API for Pookie Notifications

## 1. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key

## 2. Set Environment Variable

### For Local Development:
Create a `.env` file in the `functions` folder:
```
GEMINI_API_KEY=your_api_key_here
```

### For Firebase Production:
```bash
firebase functions:config:set gemini.api_key="your_api_key_here"
```

## 3. Deploy Functions
```bash
firebase deploy --only functions
```

## 4. Test the Function
Manual trigger (for testing):
```
https://your-project-region-your-project-id.cloudfunctions.net/sendPookieNotifications
```

The scheduled function will run automatically at:
- 9 AM (Morning users)
- 12 PM (Random selection)
- 3 PM (Random selection) 
- 6 PM (Evening users)
- 9 PM (Random selection)
