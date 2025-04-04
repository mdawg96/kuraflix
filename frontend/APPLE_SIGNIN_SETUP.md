# Setting Up Apple Sign In for KuraFlix

This guide will help you configure Apple Sign In for your KuraFlix application using Firebase Authentication.

## Prerequisites

1. An Apple Developer account with membership in the Apple Developer Program
2. Firebase project with Authentication enabled
3. Xcode 11 or later (for testing on iOS)

## Configuration Steps

### 1. Set Up Sign In with Apple in the Apple Developer Console

1. Log in to the [Apple Developer Portal](https://developer.apple.com/).
2. Go to **Certificates, Identifiers & Profiles**.
3. From the sidebar, select **Identifiers**.
4. Create a new App ID or select an existing one.
5. Enable **Sign In with Apple** capability.
6. Configure your primary App ID (if you have multiple App IDs, ensure your primary App ID has Sign In with Apple enabled).
7. Create a Services ID:
   - Click the "+" button to register a new identifier.
   - Select "Services ID" and click Continue.
   - Enter a description and identifier (e.g., `com.kuraflix.service`).
   - Enable **Sign In with Apple** for this Service ID.
   - Configure the websites where you'll implement Sign In with Apple.
     - Add `https://naruyo-6bf58.firebaseapp.com/__/auth/handler` as an authorized domain.
     - Add your production domain if available.

### 2. Generate a Private Key for Sign In with Apple

1. From the sidebar, select **Keys**.
2. Click the "+" button to register a new key.
3. Name the key "Sign in with Apple for KuraFlix".
4. Enable **Sign In with Apple** capability.
5. Configure for your primary App ID.
6. Register the key and download the `.p8` file (keep this file secure - you can only download it once).
7. Note your **Key ID**.

### 3. Configure Firebase for Apple Sign In

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Go to **Authentication** > **Sign-in method**.
4. Enable **Apple** as a sign-in provider.
5. Fill in the required fields:
   - **Services ID**: The identifier you created in the Apple Developer Console
   - **Team ID**: Your Apple Developer Team ID (can be found in the membership details)
   - **Key ID**: The ID of the private key you generated
   - **Private Key**: Upload the `.p8` file you downloaded
   - **Enable Apple provider in the Firebase Admin SDK**: Enable this if you're using server-side authentication

6. Click **Save**.

### 4. Configure Apple Sign In for Web

1. Register a "Web Authentication" configuration for your Service ID in the Apple Developer Console:
   - Go to **Identifiers** > Your Service ID
   - For "Website URLs", add your domain URLs:
     - **Domains and Subdomains**: `naruyo-6bf58.firebaseapp.com`
     - **Return URLs**: `https://naruyo-6bf58.firebaseapp.com/__/auth/handler`
   - Click **Save**.

2. If you're using a custom domain, add that domain as well to both Firebase and Apple Developer Console.

### 5. Configure Private Email Relay Service

1. In the Apple Developer Console, go to **Certificates, Identifiers & Profiles**.
2. From the sidebar, select **More** > **Configure Private Email Relay Service**.
3. Register `noreply@naruyo-6bf58.firebaseapp.com` as your email domain.

## Testing Apple Sign In

For testing, you'll need:
- An Apple ID with two-factor authentication enabled
- To be signed in to iCloud on an Apple device

To test in your development environment:
1. Run your app with the emulators: `npm run dev:emulators`
2. Try signing in with the Apple Sign In button
3. You should be redirected to Apple's sign-in flow and then back to your app

## Handling User Data

Remember that Apple Sign In provides different information depending on whether:
- It's the user's first time using Sign In with Apple with your app
- The user chose to share or hide their email

The first time a user signs in, Apple will provide their name (if they chose to share it). After that, only email and user ID are provided on subsequent logins. Handle this properly in your authentication flow.

## Complying with Apple Guidelines

When using Sign In with Apple, you must comply with Apple's guidelines:
- Display the "Sign in with Apple" button according to [Apple's design guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple/)
- Respect user privacy, especially for users who chose to hide their email
- Do not link identifiable information to anonymized Apple IDs without explicit user consent

## Troubleshooting

If you encounter issues:
1. Check that your Apple Developer account is active and part of the Apple Developer Program
2. Verify all configuration details in both Apple Developer Console and Firebase Console
3. Check that your Service ID, Team ID, and Key ID match between Apple and Firebase
4. Ensure your browser is not blocking third-party cookies
5. Check Firebase Authentication logs for specific error messages 