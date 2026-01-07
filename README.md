# Klarity AI 1.0

An emotionally intelligent mobile app that brings clarity to communication and relationships.

## Overview

Klarity AI is a ChatGPT-style conversation app built with React Native and Expo, powered by GPT-5 Mini. It provides:

- **Real-time AI conversations** with emotional intelligence
- **Emotional analysis** of messages (clarity %, detected state, relationship risk)
- **Relationship Direction Selector** - Choose your intention and get tailored guidance
- **Smart response suggestions** with different tones based on your chosen path
- **Past loops system** - Save and switch between conversation sessions
- **Beautiful dark UI** with neon accents (blue, orange, yellow, purple)
- **Premium splash screen** with glowing Klarity AI logo
- **Secure PIN authentication** - 4-digit PIN to protect your conversations

## Security Features

### Splash Screen
- **Klarna-inspired premium launch transition** with animated orb journey
- **Deep charcoal background** (#050608) for calm, grounded feel
- **Glass-like multicolor orb** with soft internal colors (teal, violet, rose)
- **"Klarity" text** in soft off-white, light weight, elegant spacing
- **Animation sequence:**
  1. Orb and "Klarity" text fade in centered together (400ms)
  2. Hold for 600ms
  3. Orb slides right, passing over text (text fades out softly)
  4. Orb ascends to header position with smooth ease-in-out curve
  5. Orb shrinks slightly to match header size
  6. Light haptic + subtle pulse glow on final placement
  7. Input screen fades in beneath the orb
- **Style notes:** No bounce, no dramatic scaling, no harsh highlights
- **Emotional intent:** Motion feels intentional, grounded, and emotionally safe

### PIN Authentication
- **First-time PIN setup** - Create 4-digit PIN on first launch
- **Secure unlock screen** - Enter PIN to access your conversations
- **Pitch black aesthetic** matching splash screen
- **Lavender accent colors** (#A78BFA) for consistency
- **Visual feedback** - PIN dots fill as you type
- **Shake animation** for wrong PIN attempts
- **AsyncStorage encryption** - Secure PIN storage

### App Flow
1. **Splash Screen** (1.5 seconds) →
2. **PIN Setup** (first time only) →
3. **Unlock Screen** (returning users) →
4. **Main App**

## Features

### Screen 1: Input/Welcome Screen
- **Minimal Dark Luxury Aesthetic** - Single-tone, elegant, calm, and premium
- **Animated Klarity AI Logo** - Premium header logo with breathing glow
  - Slow pulsing glow (5-second cycle)
  - Glow opacity: 3% → 10% → 3%
  - Subtle scale expansion (8-12%)
  - Gradient colors: Purple (#A66BFF), Blue (#4C9EFF), Aqua (#4FFFD7)
  - Gradient drift: Slow left-to-right movement (12-second cycle)
  - Heavy blur (40px) for elegant, calming effect
  - Feels alive, intelligent, and premium without distraction
- **Premium Header** - Semi-transparent black glass (18% opacity)
  - Left: Hamburger menu (Relationships, Past Loops)
  - Center: Animated Klarity AI logo with sparkle
  - Right: New Loop (+) button
  - Thin icons in warm gray (#CFCFCF)
- **Single-Color Background** - Deep midnight charcoal gradient (#050505 → #0A0A0A)
  - Matte, rich, soft finish
  - Slight 1-2% noise texture for depth
  - No multicolor blobs or overlapping gradients
- **Ultra-Minimal Floating Particles** - 20 tiny ambient dots (1-3px) drifting slowly
  - Cool gray and faint teal/blue tints (#606060, #4A5A6A, #4A6A6A)
  - Opacity 4-10% - barely visible, like calm ambient dust
  - Very soft blur (1-3px) blending seamlessly with background
  - 10-18 second drift cycles for slow, organic motion
  - Should feel like calm ambient dust, not sci-fi
- **Extremely Soft Monochromatic Flares** - 1-2 faint light glows
  - Whisper-soft cool gray-blue tones
  - Horizontal glow near bottom (3% opacity)
  - Soft glow behind main text area (4% opacity)
  - Heavy blur (40-70px equivalent) for elegance
  - Adds depth, mood, and luxury without distraction
- **Personalized Greeting** - "Hey. Ready to gain Klarity?"
  - Typography: Medium weight, 24px
  - Color: Warm soft gray (#D0D0D0)
  - Super soft halo behind text (5-6% opacity cool gray-blue)
- **Minimal Gradient Input Bar** - Pill-shaped with ultra-thin teal → purple border at 10% opacity
- **Matte Charcoal Input** - Dark #111111 background
- **Placeholder Text** - "Type a message..." in #A0A0A0
- **Minimal Icons** - Thin, elegant white/gray
- **3-bar menu dropdown** (top-left) - Access Relationships and Past Loops
- **Image upload support** - Add screenshots for analysis
- **Voice recording** - Tap mic icon to record voice messages
- Smooth navigation to conversation with text or images

**Final Vibe:**
- Single-tone, elegant dark interface with ambient floating particles and faint flare glow
- Calm, premium, minimal, and emotionally soothing
- Maintains professional aesthetic while feeling warm and welcoming
- All effects are whisper-soft - no loud colors or distracting movement

### Screen 2: Chat Screen with Understand Mode Analysis 💬✨
**FINAL LOCKED VERSION** - Klarity Chat Loop designed to help users see social situations clearly and navigate them effectively.

**Overall Style:**
- ChatGPT-inspired floating text layout (no heavy bubbles)
- Dark-mode first, minimal UI
- Subtle motion, soft fades, slight glow only when meaningful
- Luxury neutral palette (charcoal, deep grey, soft off-white)
- No harsh dividers, no loud accents
- Observational, human tone throughout

**AI Personality Rules (Understand Mode):**
- Sounds like someone who understands people and environments well
- Uses plain, everyday language
- Never diagnoses, labels, or judges
- Avoids therapy-speak ("toxic," "narcissistic," "trauma")
- Identifies patterns first, offers navigation advice second

**Interaction Feel:**
- Nothing feels mandatory
- Everything feels optional, clear, and practical
- The user always feels capable—not corrected

#### Understand Mode Philosophy

The Understand tab answers one core question: **"What is actually going on here?"**

It helps users:
- Name unspoken social dynamics
- See the situation more objectively
- Stop misattributing intent to themselves
- Decide how to move, not what to feel

**It IS:**
- Social situation decoding
- Context clarification
- Power & incentive awareness
- Pattern identification (competition, hierarchy, avoidance, signaling)
- Practical navigation guidance

**It is NOT:**
- Therapy
- Moral judgment
- Emotional validation loops
- Relationship fixing
- Telling the user who is "wrong"

#### Core Chat Loop Order (LOCKED)

**1. User Input**
- Accept text, pasted messages, or image-based messages
- Flow immediately into analysis without friction

**2. Situation Analysis Card (Floating Card)**
- Identifies the situation type in neutral language
- Explains the dynamics at play simply
- Uses phrases like "This sounds like...", "What may be happening here is..."
- No labels like "toxic" or "manipulative"

**3. Suggested Reply with Navigation Advice**
- Appears immediately after situation analysis
- Displayed as floating response block (not a hard bubble)
- Tone: calm, clear, practical
- Includes navigation guidance note (not emotional advice)
- Tap reply text to minimize/expand
- **Primary button:** "Use this reply"
- **Inline modifiers (always visible):**
  - Shorter
  - Longer
- Selecting modifiers updates reply in place, smoothly
- Previous replies auto-minimize when new one is generated
- Minimized replies show truncated preview with "Tap to expand"

**Navigation Guidance Note Examples:**
- "In situations like this, keeping communication brief and factual works best."
- "Matching the level of directness in the room can reduce friction."
- "Clarity and boundaries tend to work better than openness here."

**4. Need a Different Approach?**
- Soft follow-up option under the reply
- Simple text prompt: "Need a different approach?"
- Inline horizontal pill options:
  - **More direct** - Say it clearly
  - **More gentle** - Soften the tone
  - **More neutral** - Keep it balanced
  - **Add context** - Share more details

#### Optional Depth (AFTER the loop, never before)
- Discernment (deeper understanding)
- Add more context (text or voice)
- Voice emotion analysis (allowed)
- All appear only if the user chooses to continue

#### What's NOT in this flow
This simplified flow intentionally excludes:
- Relationship direction selector (before core loop)
- Emotion scans / face scans (before core loop)
- Boundary detection cards (before core loop)
- Deep analysis bubbles (before core loop)
- Quick summary cards
- Emotional validation messages
- Calendar logging
- Any additional features before or between the core steps

#### Design Features
- **ChatGPT-style minimal layout** - Floating text blocks, no heavy card containers
- **Fixed order** - Always: Communication Pattern → Suggested Reply → Approach Options
- **Fast and calm** - Minimal steps, quick to action
- **Unbiased** - Neutral observations without judgment
- **Dark background** (#050505 → #0A0A0C)
- **Typography-focused** - Clean, readable text
- **Generous vertical spacing** - Reduces overwhelm between messages
- **User messages** - Warmer white text with faint shadow for separation

#### Engaging Visual Style
The chat loop uses an emotionally engaging, human, and visually warm design:

**Color System (Controlled, Purposeful):**
- **Assistant messages:** Soft off-white text (#EDEDED) with subtle gradient left-edge glow
- **Gradient colors rotate:** Calm teal (#7DD3C0), Soft violet (#B47CFF), Muted lime
- **Gradients are low-opacity** (5-8%) and never distracting
- **User messages:** Warmer white (#F5F5F4) with faint shadow, no glow
- **Insight/clarity moments:** Soft color wash behind text (violet for reflection, teal for calm)

**Section Color Accents:**
- **Communication Pattern:** Soft violet color wash background, violet header accent (#8B7AA0)
- **Suggested Reply:** Soft teal color wash background, teal header accent (#5BA89A), teal left-edge glow
- **Different Approach:** Teal accent on selected pills (#7DD3C0)

#### Motion & Interaction
- **Gentle upward drift:** Messages animate with subtle 4px drift (no bouncing, no elastic)
- **Soft opacity fade:** 350ms duration with quad easing
- **Transitions feel:** Quiet, intentional, human
- Typing indicator pulses at 1.5s rhythm
- Button taps use subtle opacity change (0.7)
- Auto-scroll follows conversation naturally
- Swipe right to return to input screen
- **Focused Chat Area Transitions** - Only the chat content area animates during navigation:
  - Header, input bar, and background remain static and persistent
  - Chat content slides vertically with subtle fade (iOS-native easing)
  - No full-screen page swipe or hard cuts
  - Duration: 250ms with ease-in-out cubic bezier
  - Creates calm, lightweight transitions that reinforce Klarity as a stable, grounding environment
- **Bottom Elements Animation** - Feature buttons and input bar animate during screen transitions:
  - Consistent animation timing with content area (250ms duration)
  - Slide up from below on screen focus (20px translate)
  - Slide down on exit for natural departure effect (15px translate)

### Screen 3: Analysis Screen 📊 (Legacy - Replaced by Inline Flow)
**Note:** This screen is now replaced by the inline chatloop experience. The analysis now appears naturally within the chat conversation instead of as a separate screen.

The old flow showed analysis on a dedicated screen, but the new design integrates everything inline for a more conversational, iOS Messages-like experience.

### Screen 4: Relationship Direction Selector 🎯 (Legacy - Now Inline)
**Note:** The direction selector now appears inline within the chat conversation as interactive pill buttons, rather than as a modal screen.

#### Four Intention Options
1. **Improve the Relationship** (Blue 🔵)
   - For better communication, healing, and understanding
   - Icon: Heart
   - Tailored for connection and growth

2. **Create Healthy Distance** (Orange 🟠)
   - For emotional protection, space, and calmer interactions
   - Icon: Shield
   - Tailored for boundary-setting

3. **Maintain & Observe** (Yellow 🟡)
   - Stay neutral and watch patterns before deciding next steps
   - Icon: Eye
   - Tailored for patience and observation

4. **Gain Clarity First** (Purple 🟣)
   - If you are unsure, get help reflecting and understanding
   - Icon: Lightbulb
   - Tailored for self-discovery

#### Design Features
- **Dark luxury aesthetic** with soft neon glows
- **Interactive cards** that expand and glow when selected
- **Smooth animations** with spring physics
- **Modal presentation** sliding from bottom
- **Continue button** activates after selection

### Screen 5: Suggestions Screen 💡
**NEW ORDERED FLOW - STEP 3** - Tailored guidance ONLY appears after choosing your direction.

This screen shows personalized advice based on the path you selected.

#### What You Get
1. **Mindset Guidance**
   - 3 bold statements to frame your approach
   - Color-coded to match your intention
   - Example (Distance): "Keep responses short and neutral"

2. **Suggested Replies**
   - 3 contextual response options
   - Tailored to your chosen path
   - One-tap copy to clipboard
   - Message bubble style with copy button

3. **Why This Works**
   - Psychological explanation
   - Helps you understand the reasoning
   - Builds emotional intelligence

4. **Optional Tools**
   - Boundary language tips
   - Emotional grounding techniques
   - Pattern recognition strategies

#### Design Features
- **Dynamic color theming** based on intention
- **Horizontal slide transition** from right (iOS-style)
- **Back gesture support** - Swipe right to return
- **Neon accent lines** matching your path
- **Glassy cards** with soft blur effects

#### Flow Experience (ORDERED SEQUENCE)
1. **User sends message** in chat
2. **AI responds** with initial analysis
3. **Analysis Screen** (Step 1) - Full analysis with quick bullets
4. **Continue button** takes you to Direction Selector
5. **Direction Selector modal** (Step 2) - Choose your intention
6. **Card glows** and checkmark appears on selection
7. **Continue button** activates with intention color
8. **Suggestions Screen** (Step 3) - Slides in from right with tailored advice
9. **Copy replies** with one tap
10. **Swipe back** to re-select direction if needed

### Screen 6: Chat Screen (Inline - Legacy)
This screen is now replaced by the Guidance Screen flow, but the old inline suggestions are kept for reference:
- **Tone indicators** - Soften, Direct, or Playful
- **Use this reply** buttons - One-tap to use suggestion
- Smart context-aware responses

### NEW: Voice Recording Feature 🎤
Record voice messages and have them automatically transcribed and analyzed with emotional intelligence.

#### How it Works
1. Tap the **microphone icon** in the input bar (when no text is entered)
2. Icon turns into a red stop button while recording
3. Tap the stop button when done speaking
4. App automatically:
   - Transcribes your audio using GPT-4o Transcribe
   - **Analyzes voice emotion** examining both content AND emotional vocal qualities
   - Displays comprehensive voice-emotion scan results
   - Provides actionable next steps

#### Voice-Emotion Analysis (Automatic When Recording Audio)
When you record audio to describe a situation, Klarity analyzes BOTH:
1. **Content** - Words, meaning, tone of conflict
2. **Emotional Quality** - Rhythm, stress, hesitation, volume shifts, energy

The analysis includes:
- **Primary Detected Emotion(s)** - Main emotions identified (e.g., anxious, frustrated, hopeful)
- **Voice Indicators** - Observable vocal/linguistic cues revealing emotional state
- **Emotional Meaning Summary** - Calm interpretation of what emotions may signal internally
- **Context & Situation Understanding** - Neutral summary of the core situation
- **Supportive Reflection** - Empathetic validation acknowledging emotional state

#### Options After Voice-Emotion Analysis
After receiving your voice-emotion scan, choose your next step:
1. **Add more context** - Provide additional voice or text input
2. **Choose relationship direction** - Select your intention (Improve/Distance/Maintain/Clarity)
3. **Generate reply suggestions** - Get tailored response options
4. **Check possible outcomes** - Understand how different approaches might play out

#### Processing Flow
- **Recording** - Red pulsing stop button shows active recording
- **Animated waveform** - 35 lime green bars animate to visualize voice input
- **Visual feedback** - "Recording..." text with helper text below visualizer
- **Transcribing** - Loading overlay with "Transcribing your voice..." message
- **Analyzing** - Voice-emotion analysis with AI
- **Complete** - Displays comprehensive emotion scan card with next step options

#### Technical Details
- Uses **expo-av** for high-quality audio recording
- **react-native-reanimated v3** for smooth waveform animations
- **GPT-4o Transcribe** model for accurate speech-to-text
- **o4-mini** model for emotional and linguistic pattern analysis
- 35 animated bars with randomized timing for organic feel
- Each bar animates independently with different durations and delays
- Supports microphone permissions request
- Graceful error handling with user-friendly messages
- Audio automatically deleted after transcription

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
- **expo-av** - High-quality audio recording
- **GPT-5 Mini (o4-mini)** - AI conversation engine
- **GPT-4o Vision** - Image analysis for toxic communication
- **GPT-4o Transcribe** - Voice-to-text transcription
- **Zeego** - Native dropdown menus (iOS/Android)

## Project Structure

```
/home/user/workspace/
├── src/
│   ├── api/
│   │   └── klarity-api.ts          # GPT API integration + Image Analysis
│   ├── components/
│   │   ├── Header.tsx              # App header with animated logo
│   │   ├── AnimatedKlarityLogo.tsx # Animated logo with breathing glow
│   │   ├── InputBar.tsx            # Message input with voice & image picker
│   │   ├── FloatingParticles.tsx   # Animated ambient particles
│   │   ├── SoftFlares.tsx          # Lens flares and glow effects
│   │   ├── MessageBubble.tsx       # Chat message bubbles with image support
│   │   ├── AnalysisCard.tsx        # Emotional analysis display
│   │   ├── SuggestionsCard.tsx     # Response suggestions (legacy)
│   │   ├── ImageAnalysisCard.tsx   # Toxic communication analysis
│   │   ├── VoiceRecordingVisualizer.tsx  # Animated waveform for voice recording
│   │   ├── IntentionSelectionModal.tsx  # Intention picker for calendar
│   │   ├── RelationshipDirectionSelector.tsx  # NEW: Choose relationship path
│   │   ├── ToneModulationCard.tsx       # NEW: Tone adjustment options (Direct/Gentle/Neutral)
│   │   ├── ModulatedRepliesCard.tsx     # NEW: Tone-modulated replies with guidance notes
│   │   ├── AddContextButton.tsx         # NEW: Button to trigger context gathering
│   │   ├── InlineContextInput.tsx       # NEW: Text/voice context input component
│   │   ├── ReflectiveUnderstandingBubble.tsx  # NEW: Two-part empathy + clarity response
│   │   ├── VoiceEmotionScanBubble.tsx   # NEW: Voice emotion analysis result card
│   │   ├── FaceScanPromptBubble.tsx     # Tappable prompt for face scan
│   │   ├── EmotionalFaceScanBubble.tsx  # Expandable face scan card with minimize
│   │   └── LoopHistoryPanel.tsx    # Past loops drawer
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Stack navigation (no tabs)
│   ├── screens/
│   │   ├── InputScreen.tsx         # Welcome screen with menu access
│   │   ├── ChatScreen.tsx          # Main chat interface
│   │   ├── AnalysisScreen.tsx      # Step 1 - Full analysis display
│   │   ├── RelationshipDirectionScreen.tsx  # Step 2 - Direction selector
│   │   ├── SuggestionsScreen.tsx   # Step 3 - Tailored guidance
│   ├── state/
│   │   ├── chatStore.ts            # Legacy chat state (deprecated)
│   │   └── loopsStore.ts           # Loops and relationships state with persistence
│   └── types/
│       ├── chat.ts                 # Chat & message interfaces
│       ├── loop.ts                 # Loop type definitions
│       └── calendar.ts             # Calendar & intention types
├── App.tsx                          # App entry point
└── README.md
```

## Color Palette

### Dark Luxury Palette (NEW)
- **Electric Blue**: `#4C9EFF` - Primary gradient accent
- **Grape Purple**: `#A66BFF` - Secondary gradient accent
- **Aqua Teal**: `#4FFFD7` - Tertiary gradient accent
- **Midnight Black**: `#000000` - Pure black background
- **Gunmetal Gray**: `#0D0D0D` - Charcoal gradient midpoint
- **Cloud Gray**: `#CFCFCF` - Warm text color
- **Soft Gray**: `#9A9A9A` - Placeholder text
- **Rose Gold**: `#FFB6C1` - Optional accent

### Primary Colors
- **Background**: `#050505` (Deep black - direction selector)
- **Chat Background**: `#000000` (Pure black)
- **Deep Background**: `#0A0A0A` (Calendar/cards)
- **Accent**: `#B4FF39` (Calm lime green - legacy)
- **Text Primary**: `#FFFFFF` (White)
- **Text Secondary**: `#9CA3AF` (Gray 400)
- **Text Tertiary**: `#6B7280` (Gray 500)
- **Borders**: `#262626` (Neutral 800)
- **Cards**: `#0A0A0A` (Neutral 950)

### Relationship Intention Colors (NEW)
- **Improve**: `#4C9CFF` (Soft Blue) - Better communication and healing
- **Distance**: `#FF884D` (Orange) - Emotional protection and space
- **Maintain**: `#FFD755` (Yellow) - Neutral observation
- **Gain Clarity**: `#B47CFF` (Purple) - Understanding and reflection

### Calendar Intention Colors (Legacy)
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
- **Model**: `gpt-4o-transcribe` (for voice transcription)
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Transcription Endpoint**: `https://api.openai.com/v1/audio/transcriptions`
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

### Main Inline Chatloop Flow (NEW)
1. User opens app → sees InputScreen with welcome message
2. User types or speaks message → message is sent
3. App navigates to ChatScreen with smooth transition
4. **Inline Analysis Flow Begins:**
   - Typing indicator appears (3 pulsing dots, 1.5s)
   - Emotional validation bubble: "I can tell this weighed on you..."
   - Typing indicator returns (1.2s)
   - Quick summary card with 4 color-coded insights
   - Deep analysis bubble with psychological insights
   - Direction selector with 4 pill buttons appears
5. **User Selects Intention:**
   - Taps one of: Improve / Distance / Maintain / Gain Clarity
   - Button glows with intention color
   - Typing indicator shows (1.2s)
6. **Tailored Guidance Appears:**
   - Personalized mindset message bubble
   - 2-3 suggested reply cards with "Use this reply" buttons
7. User can:
   - Tap "Use this reply" to insert text into input bar
   - Modify the suggested response
   - Send their own message
   - Continue the conversation
   - Start new loop
   - View past loops
8. Loop continues with full context awareness
9. All conversations auto-saved to device

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

✅ Dark theme UI with neon intention colors
✅ **NEW: Inline Chatloop with Clarity Analysis** - Full analysis flows naturally within chat
✅ **NEW: Typing Indicators** - 3-dot pulsing animation with soft purple glow
✅ **NEW: Emotional Validation Bubbles** - Empathetic messages that acknowledge feelings
✅ **NEW: Quick Summary Cards** - Color-coded insights (Tone, Pattern, Impact, Core Issue)
✅ **NEW: Deep Analysis Bubbles** - Psychological insights in conversational format
✅ **NEW: Inline Direction Selector** - 4 pill buttons for choosing relationship path
✅ **NEW: Tailored Guidance Bubbles** - Personalized mindset messages per intention
✅ **NEW: Suggested Reply Cards** - Contextual responses with "Use this reply" buttons
✅ **NEW: Emotional Face Scan Card** - Premium card for facial emotion analysis
✅ **NEW: Intention-Based Color Theming** - Blue/Orange/Yellow/Purple glow effects
✅ **NEW: Natural Conversational Timing** - Realistic pauses between responses
✅ **NEW: Smooth Bubble Animations** - Spring physics and fade-in effects
✅ **NEW: iOS Messages-Style Interface** - Native mobile chat aesthetic
✅ Real-time message animations with reanimated v3
✅ Native stack navigation (no bottom tabs)
✅ 3-bar menu dropdown with native iOS/Android styling
✅ Keyboard-aware input
✅ Auto-scrolling chat
✅ GPT-5 Mini (o4-mini) integration
✅ Type-safe state management with Zustand
✅ Past loops system
✅ Loop persistence (AsyncStorage)
✅ Auto-generated loop titles
✅ Loop switching and deletion
✅ Side panel with smooth animations
✅ Image upload support
✅ Screenshot analysis for toxic communication
✅ Image-based dysfunctional pattern detection
✅ GPT-4o Vision integration
✅ **Emotional Log Calendar**
✅ **Monthly calendar view with intention tracking**
✅ **Color-coded intention dots (Blue/Orange/Yellow/Purple)**
✅ **Detailed log entry viewer**
✅ **Intention selection modal**
✅ **Reflection notes system**
✅ **Calendar persistence with AsyncStorage**
✅ **Menu-based navigation (Calendar + Past Loops)**
✅ **Voice recording with microphone icon**
✅ **Audio transcription with GPT-4o Transcribe**
✅ **Automatic voice-to-text processing**
✅ **Voice-Emotion Analysis** - Analyzes both content and emotional vocal qualities
✅ **Voice Emotion Scan Result Card** - Comprehensive analysis with structured format
✅ **Voice emotion follow-up options** - 4 actionable next steps after analysis
✅ **Visual recording feedback (red stop button)**
✅ **Animated waveform visualizer with 35 bars**
✅ **Organic animation with randomized timing**
✅ **Processing overlay with status messages**
✅ **Tone Modulation Feature** - "Need a Different Approach?" card with Direct/Gentle/Neutral options
✅ **Modulated Replies** - 1 context-aware reply with supportive guidance notes
✅ **Use Different Reply** - Generate alternative suggestions for both standard and modulated replies
✅ **Expandable Reply Controls** - Shorten/Lengthen options appear when tapping reply bubble
✅ **Add More Context** - Inline text/voice input for enriching analysis
✅ **Voice Context Transcription** - Whisper API integration for spoken context
✅ **Context Re-analysis** - Updates guidance with enriched information
✅ **Reflective Understanding Response** - Two-part empathy + clarity format after context
✅ **Confirmation Questions** - "Is this more aligned with how you're feeling?"
✅ **What would you like to do next? Card** - Three-option choice card (Add Context / Instant Reply / Choose Direction)
✅ **Instant Reply Suggestion** - Quick, balanced response generation without direction selection
✅ **Focused Chat Area Transitions** - Only chat content animates, header/input/background stay static
✅ **Bottom Elements Animation** - Feature buttons and input bar animate smoothly during screen transitions
✅ **Boundary Detection Card** - Detects potential boundary violations with calm, neutral insights
✅ **Understand My Boundaries Better Flow** - Educational boundary clarity summary with three-part breakdown
✅ **Boundary Clarity Summary Bubble** - Shows what boundary was crossed, how it impacts you, and how it affects the relationship
✅ **"How this affects me" Card Expansion** - Personal impact analysis with emotional/mental/relational/behavioral breakdown
✅ **Harm Impact Score** - Animated 0-100 score with color-coded progress bar and contextual explanation
✅ **Humanized AI Agent** - Thoughtful friend tone with natural language, contractions, and agency-focused framing
✅ **ChatGPT-Style Minimal Layout** - Floating text blocks for AI responses, no heavy card containers
✅ **Clean Message UI** - User messages in subtle bubbles, assistant messages as floating paragraphs
✅ **Rewrite Mode** - Toggle between Understand and Rewrite modes in the input bar
✅ **Mid-Loop Image Continuation** - Add new screenshots during a chat loop without resetting analysis

### NEW: Mid-Loop Image Continuation Feature
When you add a new image during an active chat loop, Klarity treats it as a continuation of the same conversation rather than starting fresh.

#### How it Works
1. Start a conversation with an initial message or image
2. Klarity analyzes and provides suggested replies
3. If the other person sends another message, take a new screenshot
4. Add the new screenshot to the same chat loop
5. Klarity analyzes it **in context** of everything already discussed

#### What You Get
- **Continuation Summary** - Brief 1-2 sentence summary of what the new message adds
- **What Changed** - Notes any escalation, de-escalation, or shift in dynamic
- **Updated Reply Suggestion** - One new reply that:
  - Aligns with the previously suggested approach
  - Mirrors the tone of the ongoing conversation
  - Is emotionally intelligent, respectful, and grounded
- **Approach Shift** (if needed) - If the new message contradicts or complicates the prior approach, explains the adjustment in one short sentence

#### Benefits
- No need to re-explain the full situation
- Keeps conversation momentum
- Maintains consistency with previous suggestions
- Adjusts gracefully when dynamics shift

### NEW: Rewrite Mode Feature
A second input mode that lets you polish your own replies with AI assistance.

#### How it Works
1. In the chat screen, find the **Understand | Rewrite** toggle above the input bar
2. **Understand mode** (default) - Analyzes incoming messages/situations as normal
3. **Rewrite mode** - Type how you want to reply, and AI polishes it

#### Rewrite Mode Behavior
- Placeholder changes to "Type how you want to reply..."
- On send, AI returns **exactly 1 polished reply** that:
  - Preserves your original intent
  - Improves clarity and reduces ambiguity
  - Strengthens boundaries where appropriate
  - Adds emotional intelligence without being therapy-speak
  - Sounds natural and human, not robotic
- Displayed as a single assistant bubble with:
  - The polished reply text
  - A note explaining your original intent
  - **"Use this reply"** button to copy it to the input bar
  - Copy icon to copy to clipboard
- **No communication pattern analysis or red flags** - just the polished reply

#### When to Use Rewrite Mode
- You know what you want to say but want it to sound better
- You want to set a boundary but need help with the wording
- You want to respond calmly but your draft feels too reactive
- You want clarity without the full analysis

### NEW: Decode Mode (Conversational Exploration)
A collaborative thinking space where users can freely brainstorm and talk through confusion, concern, or uncertainty about social situations.

#### How Decode Mode Works
Unlike Reply mode which generates response suggestions, Decode Mode is a conversational exploration where:

1. **No Scripts or Replies** - Decode mode does not generate replies unless explicitly asked
2. **Collaborative Thinking** - Works like a mental whiteboard, helping organize thoughts
3. **Pattern Surfacing** - Reflects patterns the user may not have noticed
4. **Reduce Ambiguity** - Makes indirect communication easier to understand
5. **Maintain Agency** - Never pushes action or tells user what they "should" do

#### Decode Mode Response Style
- **Invites Exploration First** - "What part of this interaction feels confusing?"
- **Reflects Before Interpreting** - Summarizes in clearer language to help user hear themselves
- **Offers Observations, Not Conclusions** - "This could be read a few ways..."
- **Normalizes Why It Is Hard to Read** - "Mixed signals are common when someone is not sure how the other person feels."
- **Keeps Agency With User** - "You do not need to decide anything yet."

#### Decode Mode Tone & Vibe
- Calm
- Grounded
- Curious
- Non-judgmental
- Collaborative ("thinking with you")
- Confidence-stabilizing (never makes user feel behind, naive, or wrong)

#### What Decode Mode Does NOT Do
- Does NOT give scripts or responses unless explicitly asked
- Does NOT diagnose intent or label people (e.g., toxic, manipulative)
- Does NOT assume negative meaning by default
- Does NOT escalate emotionally
- Does NOT pressure user to confront, decide, or act

If the user asks for advice or wording, Decode Mode suggests switching to Reply mode.

#### Example Decode Mode Closing Language
Uses soft, open endings:
- "Want to keep unpacking this?"
- "Does that framing resonate?"
- "What part of this feels most important to understand next?"

#### Success Metrics
Decode Mode success is measured by:
- Reduced confusion
- Increased clarity
- The user feeling steadier and more aware

Not by resolution.

## Future Enhancements

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

### NEW: Person Context Feature
Save context about people you interact with so Klarity can provide more grounded, human responses.

#### How it Works
1. Tap the **person icon** in the chat header (right side)
2. A Person Context Card appears **inline in the chat loop** (not as a popup modal)
3. Fill in the context details directly in the chat
4. Card is removed from chat after saving or dismissing

#### Add Someone Flow (2 Steps)
**Step 1 - Basics:**
- Enter name or nickname (required)
- Select relationship type: Dating, Romantic, Work, Family, Friend, Other
- Optional: Choose your goal - Feel steady, Make a decision, Handle conflict, Set a boundary, Improve things, Other

**Step 2 - What to Keep in Mind:**
- Select relevant context chips:
  - Power imbalance
  - Boundary concerns
  - Communication feels unclear
  - Reputation concerns
  - Past issues (legal/professional)
  - Mostly positive
  - I am not sure yet
- Optional: Add free-text notes

#### Active Person Context
When a person context is active:
- Person icon shows a green dot indicator
- Tapping shows the saved context card with:
  - Name and relationship type
  - Goal (if set)
  - Notes preview
- Actions: Switch, Edit, Clear

#### Language Guidelines
The Person Context feature uses warm, non-clinical language:
- Uses: "keep in mind", "taken together", "this adds context"
- Avoids: "tracking", "patterns", "signals", "risk analysis"
- Never labels people as good/bad/unsafe/toxic
- Always preserves user agency

#### Privacy
- All data stored locally on device (AsyncStorage)
- No automatic cloud sync
- User controls what data exists
- Can archive or delete contexts anytime

#### Person Context Card Generation (Prompt 3)
When creating a Person Context Card, the LLM generates structured JSON with:
- `knownContext` - 3-6 factual things the user shared
- `thingsToKeepInMind` - 3-6 observations that might be useful
- `helpfulQuestions` - 3-6 gentle questions to explore
- `toneNotes` - Language preferences (warm_grounded tone)
- `safety` - Guardrails (no labeling, no diagnosis, user agency)

Prompt files: `src/api/personContextPrompts.ts`

#### Chat Loop Integration (Prompt 4)
When a Person Context is active, Klarity:
- Silently considers the context when crafting responses
- Only references it explicitly when genuinely helpful
- Uses natural language like "You mentioned earlier..." or "Taken together..."
- Never sounds like surveillance ("I am tracking...", "Pattern detected...")

**Routing Rules:**
- Reference when: user mentions the person, asks for advice, expresses confusion
- Stay silent when: user is venting, topic is unrelated, would feel intrusive

**Example phrases:**
- DO: "This adds context to what you shared before..."
- DO: "If this keeps coming up..."
- DO NOT: "Based on your timeline..."
- DO NOT: "I detected a pattern..."

Prompt files: `src/api/personContextChatIntegration.ts`

#### Perception Calibration (Prompt 5)
A 2-second check-in that appears after showing a context card or heavy context.

**Question:** "How does this sit with you?"

**Options:**
1. "Feels fine" (green) → Lighter tone, fewer cautions, action-focused
2. "I am unsure" (yellow) → Balanced + one clarifying question
3. "This feels like a lot" (red) → Slower, more supportive, grounding

**Tone Adaptation by Selection:**

| Selection | Tone Style | Example Response |
|-----------|-----------|------------------|
| Feels fine | Direct, action-focused | "Makes sense. Here is one thing to try..." |
| Unsure | Balanced + clarifying | "What part feels most unclear?" |
| Feels like a lot | Slow, supportive | "You do not have to sort it all out today." |

**Components:**
- `src/components/PerceptionCalibration.tsx` - UI chips
- `src/api/perceptionTunedPrompts.ts` - Prompt snippets + examples

**Storage:**
- Perception state stored in `perceptionHistory` array on PersonContext
- Retrieved via `getLatestPerception(personContextId)`

#### Language Guardrails (Prompt 6)
Global identity-safe voice module that ensures Klarity sounds like a grounded friend, not a clinical analyst.

**Voice Identity:**
- User should feel like themselves, just more grounded
- Avoid sounding like: scientist, investigator, therapist, moral judge

**Banned Words (unless user uses them first):**
- Clinical: tracking, pattern, signals, escalation, frequency, timeline, data points, analyze, diagnosis, unsafe
- Labels: toxic, abusive, predator, narcissist, manipulator, gaslighter
- Surveillance: detected, identified, flagged, monitoring, evidence, documented

**Preferred Phrases:**
| Instead of... | Use... |
|--------------|--------|
| "tracking patterns" | "things that keep coming up" |
| "I detected" | "I noticed" |
| "frequency/timeline" | "over time" |
| "escalation" | "things getting heavier" |
| "data points" | "what you have shared" |
| "red flags" | "things worth noticing" |
| "analysis" | "making sense of" |

**Core Rules:**
- Never label people (describe behaviors instead)
- Never claim to verify external facts
- Always preserve user agency ("you decide what matters")

**Module:** `src/api/languageGuardrails.ts`

**Functions:**
- `applyLanguageGuardrails(text, userUsedWords)` - Post-process filter
- `containsBannedWords(text, exemptions)` - Check for violations
- `extractUserExemptions(userMessage)` - Get words user already used
- `buildGuardedSystemPrompt(basePrompt)` - Combine with guardrails

#### Person Context Controls (Prompt 7)
User controls for managing person context during conversations.

**Control Options:**
From the header modal, users can:
1. **Switch active person** - Select a different saved person for this loop
2. **Edit** - Modify the current person's context
3. **Clear/Delete** - Remove the person (with confirmation)
4. **Pause context toggle** - Temporarily disable context without deleting

**Pause Context Feature:**
- Toggle switch: "Context active" ↔ "Context paused"
- When paused:
  - Yellow warning styling on toggle
  - Context card appears dimmed (70% opacity)
  - Pause icon shown instead of checkmark
  - Helper text: "Klarity will not use this context right now"
- When active:
  - Purple accent styling
  - Checkmark indicator
  - Helper text: "Klarity considers this when responding"

**Prompt Logic When Paused:**
- Context JSON is NOT included in chat prompts
- `shouldReferenceContext()` returns false with reason "Context is paused by user"
- `buildChatPromptWithPersonContext()` treats paused as null context
- Assistant responds as if no person context exists

**Delete Confirmation:**
- Confirmation modal appears before deleting
- Shows person name and warning about permanent deletion
- Two buttons: Cancel (gray) / Delete (red)
- Haptic feedback on delete

#### Loop-Scoped Person Context Architecture
Person Context is specific to individual chat loops, not global across all loops.

**How it Works:**
- Each chat loop has its own `personContextId` and `isPersonContextPaused` state
- Creating/selecting a Person Context associates it with the current active loop
- Switching loops automatically loads that loop's Person Context (if any)
- This allows different conversations to focus on different people

**KlarityLoop Fields:**
```typescript
interface KlarityLoop {
  // ... existing fields
  personContextId?: string;        // ID of the person context for this loop
  isPersonContextPaused?: boolean; // Whether person context is paused for this loop
  deepSearchCompleted?: boolean;   // Whether deep search has run for this loop
}
```

**State Management:**
- `getActiveLoopPersonContextId()` - Get the current loop's person context ID
- `isActiveLoopPersonContextPaused()` - Check if context is paused for current loop
- `setActiveLoopPersonContext(id)` - Set person context for current loop
- `toggleActiveLoopPersonContextPause()` - Toggle pause state for current loop
- `clearActiveLoopPersonContext()` - Remove person context from current loop
- `setActiveLoopDeepSearchCompleted(completed)` - Track deep search status

**Hooks:**
- `useActiveLoopPersonContextId()` - React hook for current loop's context ID
- `useActiveLoopPersonContextPaused()` - React hook for pause state
- `useActiveLoopDeepSearchCompleted()` - React hook for deep search status

**Files Modified:**
- `src/types/loop.ts` - Added loop-scoped fields to KlarityLoop
- `src/state/loopsStore.ts` - Added getters, actions, and hooks
- `src/components/PersonContextModal.tsx` - Uses loop store instead of global store
- `src/api/personContextChatIntegration.ts` - Prompt logic changes

#### Deep Search (Prompt 8+)
Automatically searches publicly available information when Person Context is created, displaying results in the chat loop similar to Perplexity.

**How it Works:**
1. User creates a Person Context with name, relationship, and notes
2. Deep Search automatically runs (or can be triggered manually in chat)
3. Results appear in chat loop with sources, alignment notes, and uncertainties
4. User is asked "How does this sit with you?" for perception calibration

**Search Scope (All 9 Categories):**
Deep Search performs multiple search passes covering all of the following areas:

1. **Dating Sites and Apps**
   - Publicly indexed dating profiles
   - SEO mirrors, cached pages, archived snapshots
   - Reused usernames or photos associated with dating platforms
   - **Dating Presence Discovery** (enhanced):
     - Direct profile keyword searches ("dating profile", "tinder bio", "hinge profile", "bumble profile")
     - Platform-specific searches (Tinder, Bumble, Hinge, OkCupid, Match, POF, eHarmony, Coffee Meets Bagel, The League, Raya, Feeld, Grindr, Her, Taimi)
     - "Met on" style indirect mentions ("met on tinder", "matched on bumble")
     - Screenshot and mirror searches
     - Archive/cache discovery (web.archive.org, archive.is, archive.ph)
     - Deleted/old profile searches
   - **Important**: Does not claim accounts are active, only surfaces links and preview text

2. **Social Media Presence**
   - Major platforms (Instagram, Facebook, X/Twitter, TikTok, LinkedIn)
   - Secondary or lesser-known platforms if indexed
   - Username reuse across platforms
   - Public bios, posts, images, and comments

3. **Legal and Public Records**
   - Court case portals (civil and criminal)
   - Jail or booking records where publicly posted
   - State or federal inmate/DOC lookup pages
   - Publicly available press releases or news articles
   - Official .gov sources when available
   - **Legal Portal Discovery** (enhanced):
     - County clerk / court case search portals
     - State judiciary case lookup portals
     - Jail roster / inmate search portals
     - State DOC (Department of Corrections) inmate lookup
     - Federal court (PACER) search portals
     - **Results returned as clickable links** the user can open directly
     - **.gov domains prioritized** and marked as official portals
     - If a portal is found but cases are not easily indexed, the portal link is still surfaced with a note like: "This is the official search portal for [county/state]."
   - **Inputs that improve legal/public records pass:**
     - State (extracted from location or provided directly)
     - County/region (for county-level court searches)
     - Middle initial (for name disambiguation)
     - Age range/birth year (for narrowing results)

4. **Professional and Business Footprint**
   - Company websites and staff bios
   - LinkedIn and professional directories
   - Business registrations and public filings
   - Professional licenses where searchable

5. **Username and Alias Reuse**
   - Occurrences of the same username across multiple sites
   - Variations of usernames that appear connected
   - Old or secondary usernames that remain publicly indexed

6. **Images and Visual Footprint**
   - Public profile photos reused across platforms
   - Image search results and thumbnails
   - Archived or cached image pages
   - **Image Search Discovery** (enhanced):
     - Direct name + image searches (profile photo, headshot, picture)
     - Name + location image searches
     - Username/handle image searches with variations
     - Platform-specific image searches (LinkedIn, Facebook, Instagram, Twitter, TikTok)
     - Professional/news image searches (speaker photo, company photo, press photo)
     - Dating platform image searches (Tinder, Bumble, Hinge photos)
     - Archive/cached image searches
     - **Results returned as image cards** with:
       - Thumbnail URL (when available)
       - Source page URL (link-first for user to open)
       - Title/snippet if available
       - Source type categorization (profile_photo, social_media, professional, dating_platform, etc.)
     - **Near-duplicate image detection** to reduce redundant results
     - Images sorted by: verified matches first, then by source type priority

7. **Public Writing and Comments**
   - Blog posts, Medium articles, guest posts
   - Forum posts, Reddit comments, Quora answers
   - Any publicly indexed written content tied to the name or username

8. **Location History Signals**
   - Locations mentioned in bios, profiles, or posts
   - Changes in listed cities over time
   - Public check-ins or tagged locations

9. **Archived and Cached Pages**
   - Wayback Machine snapshots
   - Cached search results
   - Deleted but still indexed pages
   - **Archived Page Discovery** (enhanced):
     - Wayback Machine searches (web.archive.org) for name, location, and username
     - Archive.is / Archive.ph searches
     - General cached/archived page searches (deleted profiles, old profiles)
     - Platform-specific archive searches (social media and dating platform archives)
     - **Discovered profile URL archive searches** - When profile URLs are found in earlier passes, searches for archived versions of those specific URLs
     - **Results returned as archived page cards** with:
       - Archive URL (direct link to the archived snapshot)
       - Original URL (the URL that was archived)
       - Snapshot date (when available, extracted from archive URL)
       - **Snapshot label** - Human-readable label like "Archived snapshot from March 2023 (Wayback Machine)"
       - Title and description if available
       - Archive source type (wayback_machine, archive_is, google_cache, cached_page)
       - Content type categorization (profile, post, article, page, image)
     - **Results labeled as "archived snapshots"** to clearly distinguish from live pages
     - Results sorted by: verified matches first, then by archive source priority (Wayback Machine → Archive.is → Google Cache → Other)

**Optional Inputs for Better Results:**
The Person Context Card includes optional fields to improve Deep Search accuracy:

- **Profile photo** - Add a photo of the person to help with visual matching and image search
- **County or region** - Helps with court and public record searches
- **Middle name or initial** - Helps distinguish people with similar names
- **Approximate age range** - Used only to narrow public matches
- **Previous city or state** - If they recently moved or lived elsewhere
- **Company, business, or role** - Used for professional or business searches
- **Known aliases or past usernames** - Any usernames they have used before, even if old

**Multi-Pass Search Strategy:**
The search executes passes in a specific order to ensure thorough coverage:
1. **NAME_LOCATION** - Name + location combinations (always runs first)
2. **PLATFORM_TARGETED** - Social media and professional site-specific searches
3. **USERNAME_FIRST** - Username-based searches (if username available)
4. **DATING_MIRRORS** - Dating platforms, profile mirrors, and indirect mentions
5. **LEGAL_RECORDS** - Court records, jail rosters, state DOC, .gov portals
6. **ARCHIVED_CACHED** - Wayback Machine, archive.is, cached pages
7. **IMAGES_VISUAL** - Profile photos, image search results (bonus pass)
8. **USERNAME_EXPANDED** - Username variations and niche platforms (bonus pass)

**Minimum Passes Requirement:**
- **At least 4 passes** must complete before early stopping is allowed
- Search does NOT stop early just because an earlier pass returned nothing
- Ensures thorough coverage even when early results look sparse

**Weak-Result Detection with Retry Logic:**
When a pass returns thin results (0 new sources), the system automatically:
1. Generates expanded retry queries based on pass type
2. Includes name variations, location parts, aliases
3. Adds pass-specific expansions (e.g., additional platforms, search terms)
4. Executes retry search with expanded queries
5. Merges any new sources found into accumulated results

Query variations used:
- Exact name in quotes
- Name + location combinations
- Name + county if provided
- Name variations (with/without middle name/initial)
- Each known username independently
- Aliases if provided

**Multi-Search Enforcement (Prevents Shallow Searching):**
Deep Search is configured to REQUIRE multiple distinct web searches per request:
- **Minimum 10 searches** required per search pass
- **Required search categories** per pass:
  - Name-only searches
  - Name + location searches
  - Platform-targeted searches (using site: filters)
  - Username-only searches (if username provided)
  - Dating platform searches
  - Legal/public records searches
- **Search execution logging** tracks:
  - Number of queries provided
  - Estimated searches executed
  - Whether minimum threshold was met
- **Explicit instructions** prevent the model from:
  - Stopping after 1-3 searches
  - Claiming "comprehensive search" without executing queries
  - Skipping platform-targeted searches
- **Console logging** shows search metrics:
  - `[PassSearch:PassName] Starting with X queries (min required: 10)`
  - `[PassSearch:PassName] Completed. Estimated searches executed: X/Y`
  - `[MultiPass] Pass N search metrics: { queriesProvided, searchesExecuted, meetsMinimum }`

**Page Fetching & Identifier Extraction (Second-Wave Search):**
After initial search passes complete, Deep Search automatically:
1. **Fetches top result pages** - Retrieves HTML content from up to 10 discovered URLs
2. **Extracts identifiers** from each page:
   - Usernames and @handles
   - Social profile links (Instagram, Twitter, LinkedIn, etc.)
   - Email addresses
   - Structured metadata (OpenGraph, JSON-LD)
   - Outbound links to other profiles
3. **Detects JS-heavy pages** - Pages that require JavaScript rendering are marked for later handling
4. **Triggers second-wave search** - New usernames/links are fed back into the search runner

**Identifier Extraction Patterns:**
- `@username` mentions in page content
- Platform-specific URL patterns (twitter.com/user, instagram.com/user, etc.)
- JSON-LD structured data (Person schema, ProfilePage schema)
- OpenGraph metadata (og:title, og:description)
- Twitter Card metadata (twitter:site, twitter:creator)

**Second-Wave Search Flow:**
Deep Search uses a three-stage pipeline:

```
First Wave (8 passes) → Page Extraction → Second Wave (prioritized queries)
```

**Stage 1: First Wave Search**
- Executes 8 ordered search passes (NAME_LOCATION, PLATFORM_TARGETED, etc.)
- Collects URLs and sources from web search results
- Minimum 4 passes required before early stopping

**Stage 2: Page Fetching & Extraction**
- Fetches top 10 result URLs in parallel
- Extracts identifiers from HTML content:
  - Usernames and @handles
  - Social profile links
  - Email addresses
  - OpenGraph/JSON-LD metadata
- Marks JS-heavy pages for special handling

**Stage 3: Second Wave Search (Prioritized)**
When new identifiers are discovered, generates prioritized queries across 7 levels:

| Priority | Category | Example Query |
|----------|----------|---------------|
| 1 (Highest) | Username Only | `"newusername123"` |
| 2 | Username + Platform | `newusername123 site:instagram.com` |
| 3 | Profile URL Lookup | `instagram.com/newusername123` |
| 4 | Forum Mentions | `"newusername123" site:reddit.com` |
| 5 | Archive Mentions | `"newusername123" site:web.archive.org` |
| 6 | Domain Searches | `"personname" site:discovered-domain.com` |
| 7 (Lowest) | Connection Verify | `"newusername123" "personname"` |

**Second-Wave Query Categories:**

1. **Username-Only Queries** (Priority 1)
   - Direct quoted username search
   - Finds any mention of the exact username

2. **Username + Platform Queries** (Priority 2)
   - Platform-specific site: searches
   - Covers: Instagram, Twitter/X, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Snapchat, Reddit, GitHub, Medium, Tumblr, Discord, Twitch, Telegram, WhatsApp

3. **Profile URL Lookups** (Priority 3)
   - Direct profile URL pattern searches
   - Constructs platform-specific URL patterns

4. **Forum Mention Searches** (Priority 4)
   - Searches discussion platforms for username mentions
   - Covers: Reddit, Quora, Stack Overflow, Hacker News, Discord, Telegram, 4chan, KiwiFarms, Lipstick Alley, Tattle.life, Guru Gossip, Fishbowl, Blind

5. **Archive Mention Searches** (Priority 5)
   - Searches archive sites for preserved content
   - Covers: web.archive.org, archive.is, archive.ph, archive.today, Google cache, ghostarchive.org

6. **Domain-Specific Searches** (Priority 6)
   - Searches discovered domains for person mentions
   - Uses domains extracted from first-wave results

7. **Connection Verification Queries** (Priority 7)
   - Confirms links between discovered usernames and original person
   - Uses both username and person name together

**Second-Wave Result Merging:**
- Results from second-wave are merged with first-wave sources
- Smart deduplication removes near-duplicate entries:
  - Exact URL matches removed
  - Similar summaries (>60% word overlap) consolidated
  - Original source preserved when duplicates found

**MultiPassResult Second-Wave Stats:**
```typescript
secondWaveQueryStats: {
  usernameOnly: number;      // Priority 1 queries generated
  usernamePlatform: number;  // Priority 2 queries generated
  profileLookup: number;     // Priority 3 queries generated
  forumMentions: number;     // Priority 4 queries generated
  archiveMentions: number;   // Priority 5 queries generated
  domainSearches: number;    // Priority 6 queries generated
  connectionVerify: number;  // Priority 7 queries generated
  total: number;             // Total second-wave queries
}
```

**JS-Heavy Page Handling:**
Pages from these domains are marked as requiring special handling:
- instagram.com, facebook.com, twitter.com, x.com
- tiktok.com, linkedin.com, snapchat.com, threads.net
These pages return minimal content without JavaScript execution.

**Headless Browser Fallback (JS-Heavy Pages):**
When standard HTTP fetch returns minimal content from JS-heavy pages, Deep Search automatically attempts fallback methods to extract content:

1. **Detection Phase:**
   - Analyzes page content for JS framework indicators (React, Vue, Angular, Next.js, Nuxt)
   - Checks for empty body patterns, noscript warnings, minimal text content
   - Assigns priority score (1-10) based on domain and content analysis
   - Determines recommended fallback method

2. **Fallback Methods (tried in order of likelihood):**
   | Method | Description | Best For |
   |--------|-------------|----------|
   | `mobile_user_agent` | Re-fetch with mobile UA | Sites serving simpler mobile pages |
   | `google_cache` | Fetch from Google Cache | Recently indexed pages |
   | `archive_snapshot` | Fetch from Wayback Machine | Older or deleted content |
   | `api_render_service` | External render API (if configured) | Critical pages |

3. **Performance Controls:**
   - Maximum 5 pages rendered per search (configurable)
   - 2 concurrent renders to limit load
   - 15 second timeout per render
   - 2 second page settle time for dynamic content

4. **Content Extraction from Rendered Pages:**
   - Visible text extraction (scripts/styles removed)
   - Username and @handle detection
   - Social profile URL extraction
   - Email address detection
   - OpenGraph/Twitter Card metadata

5. **Result Merging:**
   - Headless results merged back into original fetch results
   - New identifiers deduplicated and added to extraction pool
   - Second-wave search uses combined identifier set

**JS-Heavy Detection Indicators:**
```typescript
// High confidence (weight 10):
- <div id="__next"></div>  // Next.js
- <div id="root"></div>    // React SPA
- <noscript>enable javascript</noscript>

// Medium confidence (weight 7-9):
- __NEXT_DATA__
- __NUXT__
- data-reactroot
- ng-version

// Low confidence (weight 5-6):
- High script tag count with low text content
- window.__INITIAL_STATE__
```

**MultiPassResult Headless Fields:**
- `headlessRenderResults` - Detailed results from each headless render attempt
- `headlessRenderedCount` - Number of pages successfully rendered
- `headlessExtractedIdentifiers` - Identifiers found only through headless rendering

**MultiPassResult Enhanced Fields:**
- `pageFetchResults` - Detailed results from each fetched page
- `secondWaveInput` - Discovered identifiers that triggered second-wave
- `secondWaveExecuted` - Whether second-wave search ran
- `secondWaveSources` - Number of new sources from second-wave
- `jsHeavyPages` - URLs marked as needing JS rendering
- `extractedIdentifiers` - All usernames, links, emails found

**Key Framing Rules:**
- Finding something does not mean it is bad
- Not finding something does not mean it does not exist
- Surfaces alignment or misalignment with what user has shared
- If multiple people match, says so clearly
- If nothing found, explains possible reasons
- If identity is unclear, results are treated as possible matches rather than confirmed

**Safety Guardrails:**
- Only uses publicly accessible information
- Does NOT access private accounts or bypass privacy settings
- Checks for safety concerns before searching
- Blocks surveillance-intent requests
- Shows safety resources if danger keywords detected

**Results Display:**
- Summary of what was searched across all 9 categories
- Sources found (expandable cards by category)
- Alignment notes (matches what user shared)
- Uncertainties (could not verify)
- Perception check: "How does this sit with you?"

**Auto-Trigger Conditions:**
- Dating or romantic relationships
- User notes contain uncertainty indicators ("not sure", "feels off", etc.)

**Manual Trigger Phrases:**
- "Search for..."
- "Look up..."
- "What can you find about..."
- "Do a deep search"
- "Check their online presence"

**Auto-Trigger Flow:**
When a user completes adding person context info from the Input Screen:
1. User taps person icon in header → PersonContextModal opens
2. User fills in name, relationship, notes → taps Save
3. `onPersonContextCreated` callback fires with new person context ID
4. InputScreen navigates to ChatScreen with `triggerDeepSearch: true`
5. ChatScreen detects the flag and auto-runs Deep Search
6. Loading state shows "Searching public sources..."
7. Results appear in chat as `DeepSearchResultBubble`

**Files:**
- `src/api/deepSearch.ts` - Prompts, types, search categories, and parsing
- `src/api/deepSearchService.ts` - Orchestration, multi-pass runner, and LLM calls
- `src/api/deepSearchPageFetcher.ts` - Page fetching, identifier extraction, second-wave input
- `src/api/deepSearchHeadlessFetcher.ts` - Headless browser fallback for JS-heavy pages
- `src/api/deepSearchLogger.ts` - Internal developer logging for debugging
- `src/components/DeepSearchResultBubble.tsx` - Chat UI component
- `src/types/chat.ts` - DeepSearchLoadingMessage, DeepSearchResultMessage types
- `src/types/personContext.ts` - DeepSearchExtendedContext interface
- `src/screens/ChatScreen.tsx` - Auto-trigger logic and message rendering
- `src/screens/InputScreen.tsx` - Navigation with triggerDeepSearch param

**Developer Logging:**
Deep Search includes comprehensive internal logging for debugging. Every search run records:
- Person ID and timestamp
- Inputs provided (name, location, username, anchor type)
- Number and list of queries executed
- Categories attempted (dating, social, legal, professional, etc.)
- Number of results returned per category
- Whether identity ambiguity was detected
- Performance metrics (duration in ms)
- Errors with stage information

Logs are stored in memory (last 50 entries) and can be accessed via:
- `getDeepSearchLogs()` - Get all stored logs
- `getLastDeepSearchLog()` - Get most recent log entry
- `clearDeepSearchLogs()` - Clear all stored logs
- `formatLogForConsole(entry)` - Format log for readable console output

## Development

The app runs on Expo SDK 53 and is automatically served on port 8081.

**Important**: This is a mobile-first design optimized for iOS (iPhone 16 Pro Max), with full support for Android as well.

