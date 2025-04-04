# Firebase Setup Guide for KuraFlix

This guide will help you set up Firebase for the KuraFlix application using the Firebase CLI.

## Prerequisites

1. Node.js and npm installed on your machine
2. A Google account

## Steps to set up Firebase

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This will open a browser window where you can log in with your Google account.

### 3. Initialize Firebase in your project

```bash
cd frontend
firebase init
```

Follow the prompts:
- Select the Firebase features you want to use (Authentication, Hosting, etc.)
- Select "Create a new project" or use an existing one
- Follow the remaining prompts to set up your project

### 4. Get your Firebase configuration

After creating your project, go to the Firebase console:

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the gear icon (⚙️) next to "Project Overview" and select "Project settings"
4. Scroll down to "Your apps" section
5. If you haven't added a web app yet, click on the web icon (</>) to add one
6. Register your app with a nickname (e.g., "KuraFlix Web")
7. Copy the Firebase configuration object

### 5. Add your Firebase configuration to .env.local

Edit the `.env.local` file in the frontend directory and add your Firebase configuration values:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 6. Enable Authentication Methods

1. Go to the Firebase console
2. Navigate to Authentication > Sign-in method
3. Enable the authentication methods you want to use (Email/Password, Google, etc.)

## Testing the Setup

Start your development server:

```bash
npm run dev
```

Try to sign up, log in, or perform other Firebase-related actions to ensure everything is working correctly.

## Troubleshooting

If you encounter issues:

1. Make sure you have the correct Firebase configuration in `.env.local`
2. Check that you've enabled the required Firebase services
3. Check the browser console for errors
4. Make sure you've added the required Firebase dependencies to your project

## Security Notes

- Never commit your `.env.local` file to version control
- Use Firebase security rules to protect your data
- Consider using Firebase Auth Emulator for local development 