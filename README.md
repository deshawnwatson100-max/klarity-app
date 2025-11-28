# Klarity AI 1.0

An emotionally intelligent mobile app that brings clarity to communication and relationships.

## Overview

Klarity AI is a ChatGPT-style conversation app built with React Native and Expo, powered by GPT-5 Mini. It provides:

- **Real-time AI conversations** with emotional intelligence
- **Emotional analysis** of messages (clarity %, detected state, relationship risk)
- **Smart response suggestions** with different tones (soften, direct, playful)
- **Past loops system** - Save and switch between conversation sessions
- **Beautiful dark UI** with lime green accents (#B4FF39)

## Features

### Screen 1: Input/Welcome Screen
- Clean, minimalist welcome screen
- "How can I help bring clarity?" prompt
- Input bar with text, voice, and attachment options
- Smooth navigation to conversation
- Access to past loops via header button

### Screen 2: Chat Screen
- ChatGPT-style threaded conversation
- User messages on the right (lime border)
- AI responses on the left
- Smooth fade-in animations for messages
- Auto-scrolling to latest message
- Header with navigation and history access

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

### NEW: Past Loops System 🎉
The app now supports multiple conversation sessions:

#### What are Loops?
A "loop" is a single conversation session with Klarity AI. Each loop maintains:
- Unique conversation history
- Auto-generated title from first message
- Created/updated timestamps
- Emotional clarity scores
- Complete message thread

#### How to Use Loops

**Starting a New Loop:**
1. Tap the **"+"** button in the header (top-right)
2. Or use "Start New Loop" in the Past Loops panel
3. Your current conversation will auto-save
4. Start fresh with a blank conversation

**Viewing Past Loops:**
1. Tap the **clock icon** (🕐) in the header
2. Side panel slides in from the right
3. See all your previous conversations with:
   - Title (auto-generated from first message)
   - Message preview
   - Time stamp (e.g., "2h ago", "Yesterday")
   - Emotional clarity percentage

**Switching Between Loops:**
1. Open Past Loops panel
2. Tap any loop card
3. Chat screen loads that conversation
4. Active loop has a lime green dot indicator

**Deleting Loops:**
1. Open Past Loops panel
2. Tap the trash icon on any loop card
3. Loop is removed immediately
4. If you delete the active loop, switches to most recent

#### Loop Storage
- All loops are **automatically saved** to device storage (AsyncStorage)
- Conversations persist between app restarts
- No manual save needed
- Data stays on your device (privacy-first)

#### Auto-Generated Titles
- First user message becomes the loop title
- Long messages are truncated (40 chars)
- Example: "Tough conversation with my partner..."
- You can customize titles later (future enhancement)

#### Loop Metadata Tracked
Each loop stores:
```typescript
{
  id: string              // Unique identifier
  title: string           // Auto-generated or custom
  createdAt: string       // ISO date
  updatedAt: string       // Last message time
  messages: ChatMessage[] // Full conversation
  emotionalClarity?: number  // From analysis
}
```

## Tech Stack

- **React Native 0.76.7** with Expo SDK 53
- **TypeScript** - Type-safe development
- **Zustand** - State management with AsyncStorage persistence
- **React Navigation** - Native stack navigation
- **NativeWind** - Tailwind CSS for React Native
- **React Native Reanimated v3** - Smooth animations
- **GPT-5 Mini** - AI conversation engine

## Project Structure

```
/home/user/workspace/
├── src/
│   ├── api/
│   │   └── klarity-api.ts          # GPT-5 Mini API integration
│   ├── components/
│   │   ├── Header.tsx              # App header with loops nav
│   │   ├── InputBar.tsx            # Message input with voice
│   │   ├── MessageBubble.tsx       # Chat message bubbles
│   │   ├── AnalysisCard.tsx        # Emotional analysis display
│   │   ├── SuggestionsCard.tsx     # Response suggestions
│   │   └── LoopHistoryPanel.tsx    # NEW: Past loops drawer
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Navigation setup
│   ├── screens/
│   │   ├── InputScreen.tsx         # Welcome/input screen
│   │   └── ChatScreen.tsx          # Main chat interface
│   ├── state/
│   │   ├── chatStore.ts            # Legacy chat state (deprecated)
│   │   └── loopsStore.ts           # NEW: Loops state with persistence
│   └── types/
│       ├── chat.ts                 # TypeScript interfaces
│       └── loop.ts                 # NEW: Loop type definitions
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

## State Management

### Loops Store (`src/state/loopsStore.ts`)
The main state store for managing conversation loops:

**State:**
- `loops: KlarityLoop[]` - All saved loops
- `activeLoopId: string | null` - Currently active loop
- `isHistoryPanelOpen: boolean` - UI state for drawer

**Actions:**
- `createNewLoop()` - Start fresh conversation
- `switchToLoop(id)` - Load a different loop
- `deleteLoop(id)` - Remove a loop
- `addMessageToActiveLoop(message)` - Add message to current loop
- `toggleHistoryPanel()` - Open/close past loops drawer

**Persistence:**
- Uses Zustand's `persist` middleware
- Stores data in AsyncStorage
- Only persists `loops` and `activeLoopId` (not UI state)
- Survives app restarts

### Adding New Fields to Loops
To extend loop functionality later:

1. **Update Type Definition** (`src/types/loop.ts`):
```typescript
export interface KlarityLoop {
  // ... existing fields
  personalityAlignment?: number;  // NEW
  relationshipContext?: string;   // NEW
}
```

2. **Update Store Actions** (`src/state/loopsStore.ts`):
```typescript
updateLoopPersonality: (loopId: string, score: number) => {
  set((state) => ({
    loops: state.loops.map((loop) =>
      loop.id === loopId
        ? { ...loop, personalityAlignment: score }
        : loop
    ),
  }));
}
```

3. **Update UI** (`src/components/LoopHistoryPanel.tsx`):
Display new fields in loop cards

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
   - Start new loop
   - View past loops
6. Loop continues with context-aware responses
7. All conversations auto-saved

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
✅ **NEW: Past loops system**
✅ **NEW: Loop persistence (AsyncStorage)**
✅ **NEW: Auto-generated loop titles**
✅ **NEW: Loop switching and deletion**
✅ **NEW: Side panel with smooth animations**

## Future Enhancements

- Voice input implementation
- Image upload and analysis
- Export conversations
- Dark/light theme toggle
- Custom tone preferences
- Relationship context tracking
- Custom loop titles (edit after creation)
- Loop search and filtering
- Loop tags/categories
- Loop sharing

## Development

The app runs on Expo SDK 53 and is automatically served on port 8081.

**Important**: This is a mobile-first design optimized for iOS (iPhone 16 Pro Max), with full support for Android as well.

