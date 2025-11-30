# Klarity AI 1.0

An emotionally intelligent mobile app that brings clarity to communication and relationships.

## Overview

Klarity AI is a ChatGPT-style conversation app built with React Native and Expo, powered by GPT-5 Mini. It provides:

- **Real-time AI conversations** with emotional intelligence
- **Emotional analysis** of messages (clarity %, detected state, relationship risk)
- **Smart response suggestions** with different tones (soften, direct, playful)
- **Past loops system** - Save and switch between conversation sessions
- **Emotional Log Calendar** - Track and visualize your emotional journey over time
- **Beautiful dark UI** with lime green accents (#B4FF39)

## Features

### Screen 1: Input/Welcome Screen
- Clean, minimalist welcome screen
- "How can I help bring clarity?" prompt
- **3-bar menu dropdown** (top-left) - Access Calendar and Past Loops
- Input bar with text, voice, and image upload options
- Smooth navigation to conversation

### Screen 2: Chat Screen
- ChatGPT-style threaded conversation
- User messages on the right (lime border)
- AI responses on the left
- Image upload and analysis support
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

### NEW: Image Analysis Feature 🎉
Upload screenshots of text conversations to analyze for toxic communication patterns:

#### How it Works
1. Tap the **image icon** in the input bar
2. Select a screenshot from your photo library
3. Optionally add a text message alongside the image
4. Send to analyze

#### Analysis Results
Klarity AI uses GPT-4o Vision to detect dysfunctional communication patterns including:
- **Gaslighting** - Denying someone's reality
- **Blame Shifting** - Refusing responsibility
- **Invalidation** - Dismissing feelings
- **Passive Aggression**
- **Manipulation**
- **Contempt or Criticism**
- **Defensiveness**
- **Stonewalling**

#### Image Analysis Card Shows
- **Quick Summary** - 2-3 sentence overview of issues detected
- **Communication Patterns** - Labeled dysfunction tags with explanations
- **Emotional Impact** - How this communication makes people feel
- **Suggested Response** - A healthy, regulated reply you can send
- **Copy Reply Button** - One-tap to copy suggested response

The analysis appears inline in the conversation thread with the same calm lime + dark aesthetic.

### NEW: Emotional Log Calendar 🎉🗓️
Track your emotional journey over time with a beautiful calendar interface.

#### Calendar Home Screen (Monthly View)
A full-screen monthly calendar showing your emotional timeline:
- **Home button** (top-right) - Quick return to welcome screen
- **Dark luxury design** with deep black background (#0A0A0A)
- **Color-coded intention dots** on dates with entries
  - 🔵 **Blue** - Improve (working to improve the relationship)
  - 🟠 **Orange** - Distance (creating healthy distance)
  - 🟡 **Yellow** - Maintain (maintaining current boundaries)
  - 🟣 **Purple** - Gain Clarity (understanding the situation better)
- **Glowing neon indicators** with soft shadows on logged dates
- **Month navigation** with arrow buttons
- **Legend** showing all intention types
- **Multiple entries per day** shown with stacked color dots
- Tap any date to view full log details

#### Log Detail Screen
When you tap a date, see everything from that day:

**Date Header**
- Large, elegant date display
- Color-coded intention badge

**Your Situation Card**
- Original issue text you shared
- One-line quick summary highlighting the main issue
- Example: "⚠️ Main Issue: Feeling overwhelmed by inconsistent communication"

**Klarity Analysis**
Quick summary with color-coded breakdown:
- **Tone** (Blue) - Communication tone detected
- **Pattern** (Purple) - Behavior pattern identified
- **Emotional Impact** (Orange) - How it affects you
- **Core Issue** (Yellow) - Root problem
- Full paragraph analysis with insights

**Your Relationship Intention**
- Selected path: Improve / Distance / Maintain / Gain Clarity
- Beautiful color-coded tag matching your choice

**Guidance Provided**
- Suggested replies (tap to copy)
- Emotional advice
- Boundary wording suggestions
- Safety notes (highlighted in red if critical)

**Your Response**
- What you actually sent
- Timestamp
- View conversation button

**Reflection Notes**
- Your personal thoughts added later
- Italic styling with quotes
- Example: "I felt calmer after this conversation"

#### How Calendar Logging Works
1. Have a conversation with Klarity AI
2. Receive emotional analysis and guidance
3. Choose your relationship intention (modal appears)
4. Optionally add reflection notes
5. Entry automatically saved to calendar with:
   - Full conversation context
   - Analysis summary
   - Your chosen intention
   - Timestamp and date
   - Optional personal reflection

#### Intention Selection Modal
Beautiful modal for choosing your path:
- 4 glowing intention cards with icons and descriptions
- Smooth two-step flow:
  1. Select your intention
  2. Add optional reflection notes
- Save to calendar or skip reflection

#### Design Aesthetic
✨ Dark luxury mood with soft neon edges
✨ Clean SF Pro typography
✨ Minimal gradients and subtle animations
✨ Glassy borders with neon glow effects
✨ Emotional, calm, supportive styling
✨ Feels like a sanctuary, not a tech dashboard

#### Benefits
- **Visualize patterns** - See recurring issues over time
- **Track progress** - Notice improvement in your journey
- **Gain insights** - Understand your relationship dynamics
- **Build awareness** - Reflect on your emotional growth
- **Stay grounded** - Review past guidance when needed

### Past Loops System
The app supports multiple conversation sessions:

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
- **GPT-5 Mini (o4-mini)** - AI conversation engine
- **GPT-4o Vision** - Image analysis for toxic communication
- **Zeego** - Native dropdown menus (iOS/Android)

## Project Structure

```
/home/user/workspace/
├── src/
│   ├── api/
│   │   └── klarity-api.ts          # GPT API integration + Image Analysis
│   ├── components/
│   │   ├── Header.tsx              # App header with menu dropdown
│   │   ├── InputBar.tsx            # Message input with voice & image picker
│   │   ├── MessageBubble.tsx       # Chat message bubbles with image support
│   │   ├── AnalysisCard.tsx        # Emotional analysis display
│   │   ├── SuggestionsCard.tsx     # Response suggestions
│   │   ├── ImageAnalysisCard.tsx   # Toxic communication analysis
│   │   ├── IntentionSelectionModal.tsx  # Intention picker for calendar
│   │   └── LoopHistoryPanel.tsx    # Past loops drawer
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Stack navigation (no tabs)
│   ├── screens/
│   │   ├── InputScreen.tsx         # Welcome screen with menu access
│   │   ├── ChatScreen.tsx          # Main chat interface
│   │   ├── CalendarScreen.tsx      # Monthly calendar view
│   │   └── LogDetailScreen.tsx     # Calendar entry details
│   ├── state/
│   │   ├── chatStore.ts            # Legacy chat state (deprecated)
│   │   ├── loopsStore.ts           # Loops state with persistence
│   │   └── calendarStore.ts        # Calendar entries with persistence
│   └── types/
│       ├── chat.ts                 # Chat & message interfaces
│       ├── loop.ts                 # Loop type definitions
│       └── calendar.ts             # Calendar & intention types
├── App.tsx                          # App entry point
└── README.md
```

## Color Palette

### Primary Colors
- **Background**: `#000000` (Pure black)
- **Deep Background**: `#0A0A0A` (Calendar/cards)
- **Accent**: `#B4FF39` (Calm lime green)
- **Text Primary**: `#FFFFFF` (White)
- **Text Secondary**: `#9CA3AF` (Gray 400)
- **Text Tertiary**: `#6B7280` (Gray 500)
- **Borders**: `#262626` (Neutral 800)
- **Cards**: `#0A0A0A` (Neutral 950)

### Intention Colors (Calendar)
- **Improve**: `#3B82F6` (Blue) - Working to improve relationship
- **Distance**: `#F97316` (Orange) - Creating healthy distance
- **Maintain**: `#EAB308` (Yellow) - Maintaining boundaries
- **Gain Clarity**: `#A855F7` (Purple) - Understanding better

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

The app uses multiple OpenAI models:
- **Model**: `o4-mini-2025-04-16` (for text conversations and analysis)
- **Model**: `gpt-4o-2024-11-20` (for image vision analysis)
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Temperature**: 1 (required)
- **Max Tokens**: 300-1500 depending on use case

### Image Analysis API
The image analysis feature uses GPT-4o's vision capabilities:
- Base64 encoded images sent to API
- High detail mode for better accuracy
- JSON structured output for consistent parsing
- Analyzes text in screenshots for communication patterns

API key is accessed via: `process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`

## User Flow

### Main Chat Flow
1. User opens app → sees InputScreen with welcome message
2. Can tap "View Your Timeline" to access calendar
3. User types or speaks message → message is sent
4. App navigates to ChatScreen (Home tab)
5. AI processes message and shows:
   - AI response
   - Emotional analysis card
   - 3 suggested responses
6. User can:
   - Continue conversation
   - Use suggested response
   - Modify suggested response
   - Start new loop
   - View past loops
   - Log to calendar (future)
7. Loop continues with context-aware responses
8. All conversations auto-saved

### Calendar Flow
1. User taps **3-bar menu** (top-left) on any screen
2. Selects **Calendar** from dropdown
3. Sees monthly view with color-coded intention dots
4. Can navigate between months
5. Taps a date with entries
6. Views detailed log with full analysis and guidance
7. Can copy suggested responses
8. Can add reflection notes
9. Navigate back to calendar or start new conversation

## Features Implemented

✅ Dark theme UI with lime accents
✅ ChatGPT-style conversation interface
✅ Real-time message animations
✅ Emotional analysis with visual metrics
✅ Smart response suggestions (3 tones)
✅ Native stack navigation (no bottom tabs)
✅ **3-bar menu dropdown with native iOS/Android styling**
✅ Keyboard-aware input
✅ Auto-scrolling chat
✅ GPT-5 Mini (o4-mini) integration
✅ Type-safe state management
✅ Past loops system
✅ Loop persistence (AsyncStorage)
✅ Auto-generated loop titles
✅ Loop switching and deletion
✅ Side panel with smooth animations
✅ Image upload support
✅ Screenshot analysis for toxic communication
✅ Image-based dysfunctional pattern detection
✅ GPT-4o Vision integration
✅ Copy suggested responses
✅ **Emotional Log Calendar**
✅ **Monthly calendar view with intention tracking**
✅ **Color-coded intention dots (Blue/Orange/Yellow/Purple)**
✅ **Detailed log entry viewer**
✅ **Intention selection modal**
✅ **Reflection notes system**
✅ **Calendar persistence with AsyncStorage**
✅ **Menu-based navigation (Calendar + Past Loops)**

## Future Enhancements

- Voice input implementation
- Export conversations
- Dark/light theme toggle
- Custom tone preferences
- Relationship context tracking
- Custom loop titles (edit after creation)
- Loop search and filtering
- Loop tags/categories
- Loop sharing
- Multi-image upload support
- Image annotation/markup before analysis
- **Automatic calendar logging after conversations**
- **Monthly insights and pattern analysis**
- **Streak tracking for emotional awareness**
- **Export calendar data (PDF/CSV)**
- **Calendar reminders and check-ins**

## Development

The app runs on Expo SDK 53 and is automatically served on port 8081.

**Important**: This is a mobile-first design optimized for iOS (iPhone 16 Pro Max), with full support for Android as well.

