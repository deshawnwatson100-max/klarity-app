# Klarity AI 1.0

An emotionally intelligent mobile app that brings clarity to communication and relationships.

## Overview

Klarity AI is a ChatGPT-style conversation app built with React Native and Expo, powered by GPT-5 Mini. It provides:

- **Real-time AI conversations** with emotional intelligence
- **Emotional analysis** of messages (clarity %, detected state, relationship risk)
- **Smart response suggestions** with different tones (soften, direct, playful)
- **Beautiful dark UI** with lime green accents (#B4FF39)

## Features

### Screen 1: Input/Welcome Screen
- Clean, minimalist welcome screen
- "How can I help bring clarity?" prompt
- Input bar with text, voice, and attachment options
- Smooth navigation to conversation

### Screen 2: Chat Screen
- ChatGPT-style threaded conversation
- User messages on the right (lime border)
- AI responses on the left
- Smooth fade-in animations for messages
- Auto-scrolling to latest message

### Screen 3: Emotional Analysis (Inline)
Analysis cards appear in the conversation thread showing:
- **Emotional Clarity %** - Visual progress bar
- **Detected Emotional State** - AI-identified emotion
- **Relationship Risk Level** - Low/Medium/High indicator
- **Summary** - Clear, calm analysis

### Screen 4: Response Suggestions (Inline)
Three suggested responses with:
- **Tone indicators** - Soften, Direct, or Playful
- **Use this reply** buttons - One-tap to use suggestion
- Smart context-aware responses

## Tech Stack

- **React Native 0.76.7** with Expo SDK 53
- **TypeScript** - Type-safe development
- **Zustand** - State management
- **React Navigation** - Native stack navigation
- **NativeWind** - Tailwind CSS for React Native
- **React Native Reanimated** - Smooth animations
- **GPT-5 Mini** - AI conversation engine

## Project Structure

```
/home/user/workspace/
├── src/
│   ├── api/
│   │   └── klarity-api.ts          # GPT-5 Mini API integration
│   ├── components/
│   │   ├── Header.tsx              # App header with menu
│   │   ├── InputBar.tsx            # Message input with voice
│   │   ├── MessageBubble.tsx       # Chat message bubbles
│   │   ├── AnalysisCard.tsx        # Emotional analysis display
│   │   └── SuggestionsCard.tsx     # Response suggestions
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Navigation setup
│   ├── screens/
│   │   ├── InputScreen.tsx         # Welcome/input screen
│   │   └── ChatScreen.tsx          # Main chat interface
│   ├── state/
│   │   └── chatStore.ts            # Zustand chat state
│   └── types/
│       └── chat.ts                 # TypeScript interfaces
├── App.tsx                          # App entry point
└── README.md
```

## Color Palette

- **Background**: `#000000` (Pure black)
- **Accent**: `#B4FF39` (Calm lime green)
- **Text Primary**: `#FFFFFF` (White)
- **Text Secondary**: `#9CA3AF` (Gray 400)
- **Text Tertiary**: `#6B7280` (Gray 500)
- **Borders**: `#262626` (Neutral 800)
- **Cards**: `#0A0A0A` (Neutral 950)

## API Integration

The app uses GPT-5 Mini via OpenAI API:
- **Model**: `gpt-5-mini`
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Temperature**: 1 (required)
- **Max Tokens**: 300-1000 depending on use case

API key is accessed via: `process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`

## User Flow

1. User opens app → sees InputScreen with welcome message
2. User types or speaks message → message is sent
3. App navigates to ChatScreen
4. AI processes message and shows:
   - AI response
   - Emotional analysis card
   - 3 suggested responses
5. User can:
   - Continue conversation
   - Use suggested response
   - Modify suggested response
6. Loop continues with context-aware responses

## Features Implemented

✅ Dark theme UI with lime accents
✅ ChatGPT-style conversation interface
✅ Real-time message animations
✅ Emotional analysis with visual metrics
✅ Smart response suggestions (3 tones)
✅ Native stack navigation
✅ Keyboard-aware input
✅ Auto-scrolling chat
✅ GPT-5 Mini integration
✅ Type-safe state management

## Future Enhancements

- Voice input implementation
- Image upload and analysis
- Conversation history persistence
- Export conversations
- Multiple conversation threads
- Dark/light theme toggle
- Custom tone preferences
- Relationship context tracking

## Development

The app runs on Expo SDK 53 and is automatically served on port 8081.

**Important**: This is a mobile-first design optimized for iOS (iPhone 16 Pro Max), with full support for Android as well.
