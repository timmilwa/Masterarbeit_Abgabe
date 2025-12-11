# Attribute Tagging

A React application for tagging images with AI chat functionality. Upload an image and pin messages to specific locations on the image.

## Features

- **Image Upload**: Upload images to the left side (60% of screen width)
- **AI Chat**: Interactive chat interface on the right side (40% of screen width)
- **Image Tagging**: Click on the image to create tags and pin messages to specific locations
- **Visual Feedback**: Tags are displayed on the image with visual indicators
- **Message Pinning**: Messages can be pinned to tags, showing the relationship between chat and image locations

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Usage

1. **Upload an Image**: Click the "Upload Image" button and select an image file
2. **Create Tags**: 
   - Type a message in the chat input
   - Click anywhere on the image to pin that message to that location
   - Or click on the image first to set a pending tag location, then type your message
3. **View Tags**: Click on tags on the image to see which messages are associated with them
4. **Chat**: Type messages in the chat interface. Messages pinned to tags will show a pin indicator

## Design

This application follows the "Clean Minimalist Interactive" design system defined in `AI_Guidelines.txt`, featuring:
- Minimalist, clean, and functional design
- Subtle grayscale colors with clear accents
- Premium feel with fine borders and soft shadows
- Smooth transitions and interactions

