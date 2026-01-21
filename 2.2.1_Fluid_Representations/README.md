<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1O4t_WnZ5qqoKQWR4JpsPWWWTWW5Podcv

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set up your API key (choose one method):
   - **Option A (Recommended for development):** Create a `.env.local` file in the root directory and add:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
   - **Option B:** Enter your API key directly in the app's settings menu (gear icon) after starting the app. The key will be saved locally in your browser.
3. Run the app:
   `npm run dev`

**Note:** The `.env.local` file is automatically excluded from Git. Never commit your API key to version control.
