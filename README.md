# Klarity AI 1.0

An emotionally intelligent mobile app that brings clarity to communication and relationships.

## Overview

Klarity AI is a ChatGPT-style conversation app built with React Native and Expo, powered by GPT-5 Mini. It provides:

- **Real-time AI conversations** with emotional intelligence
- **Emotional analysis** of messages (clarity %, detected state, relationship risk)
- **Relationship Direction Selector** - Choose your intention and get tailored guidance
- **Smart response suggestions** with different tones based on your chosen path
- **Past loops system** - Save and switch between conversation sessions
- **Emotional Log Calendar** - Track and visualize your emotional journey over time
- **Beautiful dark UI** with neon accents (blue, orange, yellow, purple)
- **Premium splash screen** with glowing Klarity AI logo
- **Secure PIN authentication** - 4-digit PIN to protect your conversations

## Security Features

### Splash Screen
- **Premium launch experience** with glowing Klarity AI logo
- **Pitch black background** (#000000) for elegance
- **Soft lavender glow** pulsing behind logo (3% → 6% opacity)
- **"Find Your Clarity" tagline** with minimal loading dots
- **1.5 second auto-dismiss** for smooth app entry

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
  - Left: Hamburger menu (Calendar, Past Loops)
  - Center: Animated Klarity AI logo with ✨
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
- **3-bar menu dropdown** (top-left) - Access Calendar and Past Loops
- **Image upload support** - Add screenshots for analysis
- **Voice recording** - Tap mic icon to record voice messages
- Smooth navigation to conversation with text or images

**Final Vibe:**
- Single-tone, elegant dark interface with ambient floating particles and faint flare glow
- Calm, premium, minimal, and emotionally soothing
- Maintains professional aesthetic while feeling warm and welcoming
- All effects are whisper-soft - no loud colors or distracting movement

### Screen 2: Chat Screen with Inline Clarity Analysis 💬✨
**NEW CHATLOOP DESIGN** - Full emotional analysis flows naturally within the conversation, using chat bubbles and inline cards.

#### Experience Flow
When you send a message about a relationship situation, Klarity responds with a beautiful step-by-step inline analysis:

1. **Typing Indicator**
   - Three pulsing dots with soft luxury grey glow
   - Appears in Klarity bubble
   - 1.5 second natural pause
   - **Automatically removed when response is generated**

2. **Emotional Validation Bubble**
   - Warm, empathetic message acknowledging your feelings
   - Example: "I can tell this situation weighed on you emotionally — it makes sense you are feeling this way."
   - Left-aligned with soft lavender neon edge
   - Smooth fade-in animation

3. **Typing Again**
   - Brief pause while Klarity analyzes
   - Creates natural conversational rhythm

4. **Quick Clarity Summary Card**
   - Special styled bubble with bold color-coded highlights
   - Sparkle icon header
   - Four key insights:
     - **Tone** (Blue accent) - Communication style detected
     - **Pattern** (Purple accent) - Behavior pattern identified
     - **Emotional Impact** (Orange accent) - How it affects you
     - **Core Issue** (Yellow accent) - Root problem
   - Glowing neon frame with depth effect

5. **Deep Analysis Bubble**
   - 2-3 calm sentences with deeper psychological insights
   - Normal Klarity bubble styling
   - Soft neon signature glow

6. **Relationship Direction Selector**
   - Klarity asks: "Before I help you respond, which direction do you want to go with this relationship?"
   - Four interactive option cards in luxury grey container:
     - **Improve** (Cool Sky Blue #6BB6FF) - Better communication and connection
     - **Distance** (Warm Orange #FF9B6B) - Healthy space and protection
     - **Maintain** (Soft Amber/Gold #FFB84D) - Observe patterns before deciding
     - **Gain Clarity** (Lavender/Purple #B8A3E8) - Understand feelings better
   - Each card has soft premium glow and minimal icons
   - Tap to select, card glows with intention color
   - Smooth press animation with spring physics

7. **Tone Selection Card** ✨ NEW
   - Appears after direction selection
   - Asks: "Choose Your Tone"
   - Four tone options in minimal luxury grey pills:
     - **Calm** - Peaceful, measured response
     - **Direct** - Clear, straightforward communication
     - **Empathetic** - Understanding, compassionate tone
     - **Assertive** - Confident, firm boundaries
   - Sleek dark grey gradient base (#1A1A1A → #2A2A2A)
   - Soft grey glow and metallic outline on each pill
   - Selected pill shows checkmark and enhanced glow

8. **Typing Indicator Returns**
   - After you select tone
   - Shows Klarity is preparing tailored guidance

9. **Tailored Guidance Bubble**
   - Personalized mindset message based on your chosen path
   - Example (Distance): "Okay — to create healthy distance, we will keep things calm, neutral, and emotionally protective."
   - Bubble glows in your selected intention color
   - Sets the tone for suggested responses

10. **Suggested Reply Cards**
   - 1 contextual response option appears as card-style bubble
   - Each includes:
     - Message text in bubble format with color-matched glow
     - "Use this reply" button beneath (glows in intention color)
     - "Use different reply" button (outlined style) - generates alternative suggestion
     - Smooth lift animation on tap
   - Replies are tailored to your chosen direction AND tone
   - One tap inserts reply into input bar
   - Tap "Use different reply" to generate another suggestion
   - Shorten/Lengthen options hidden until you tap the reply bubble (smooth fade-in animation)

11. **Emotional Face Scan Prompt** ✨ NEW
   - Appears after tone modulation card in the chat flow
   - **Tappable Chat Bubble**: "Scan your face for deeper emotional insight?"
   - Styled as a system message bubble with:
     - Soft teal glow and frosted glass background
     - Scan icon in rounded circle
     - Tap anywhere on the bubble to expand
   - **On Tap - Expanded Card View**:
     - Full premium card with soft neon teal/lavender glow
     - **Minimize Button**: Top-right icon to collapse back to prompt
     - **Header**: "Emotion Face Scan" centered
     - **Subtitle**: "Scan your face to understand how you are feeling inside."
     - **Visual Center**: Animated aura rings with camera icon and waveform bars
     - **Begin Scan Button**: Soft teal glow with scan icon
     - **Helper Text**: "Your emotional insights will automatically be logged to your clarity calendar."
   - Pulsing glow animation creates gentle, alive feeling
   - Tap "Begin Scan" to open camera for facial emotion analysis
   - Premium minimal design - futuristic yet welcoming
   - **Seamless UX**: Question appears naturally in chat, expands on interest

12. **Add More Context Feature** ✨ NEW
   - "Add More Context" button appears after dysfunctional communication analysis or deep analysis
   - Tapping opens an inline context input section with two options:
   - **📄 Text Input** - Expandable text field (up to 500 characters) to type additional details
   - **🎤 Voice Input** - One-tap recording interface to speak your thoughts
   - Voice recordings are automatically transcribed using Whisper API
   - After submission, AI responds with a **two-part reflective understanding**:
     - **Part 1: Reflective Understanding** - Empathetic reflection acknowledging your feelings (2-3 sentences with warmth and validation)
     - **Part 2: Situation Clarity** - Neutral objective summary of the conflict and emotional dynamics (1-2 sentences, factual)
   - Then re-analyzes with enriched information:
     - Context is added as a user message
     - Updates deep analysis with additional context
     - Regenerates tailored guidance based on fuller picture
     - Provides fresh suggested replies
     - Asks: "Is this more aligned with how you're feeling?"
   - Dynamic color theming based on your chosen intention
   - Smooth animations and visual feedback
   - Cancel option to dismiss input without submitting

13. **Your Response Bubble**
    - When you tap "Use this reply", it appears as right-aligned user bubble
    - Smooth insert animation
    - Chat auto-scrolls to show your message

#### Design Features
- **Dark luxury background** (#000000 pure black)
- **Soft neon purples, blues, oranges, yellows** matching intention types
- **Blurred glow effects** on all bubbles
- **SF Pro Display font** throughout
- **Rounded corners everywhere** - no sharp edges
- **Natural conversational timing** between each element
- **iOS-style message threading** with bubbles
- **Safe emotional space aesthetic** - calm and supportive

#### Motion & Interaction
- All bubbles fade in with gentle spring animations
- Typing indicator pulses at 1.5s rhythm
- Button taps shrink → glow → return
- Cards slightly lift on hover and tap
- Auto-scroll follows conversation naturally
- Swipe right to return to input screen

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

### NEW: Enhanced Emotional Log Calendar 🎉🗓️✨
Track your emotional journey over time with conversation tracking, reflections, and pattern insights.

#### Calendar Aesthetic (Matching Input Screen)
The calendar now uses the **same luxurious dark gradient background** as the Input Screen for visual consistency:

**Background**
- Deep charcoal gradient foundation (#050608 → #0A0A0C → #050608)
- Subtle floating particles (20 tiny dots, 1-3px, cool gray/teal tints)
- Soft flares with whisper-soft cool gray-blue tones (3% opacity)
- Calm, minimal, emotional, and luxurious vibe

**Calendar Grid with Frosted Glass Cells**
- Translucent frosted-glass calendar day cells
- Semi-transparent backgrounds: `rgba(20, 20, 24, 0.15-0.45)`
- Soft inner-shadow for depth effect
- Subtle borders in cool gray (`rgba(156, 163, 175, 0.08)`)
- Today's date highlighted with stronger border and glow
- Dates with events have brighter backgrounds
- Smooth press animation (scale 0.95)

**Gradient-Based Event Dots with Glow**
- Event type dots now use **LinearGradient** instead of flat colors
- Three-step gradient per dot (full → CC → 88 opacity)
- Strong glow effect (shadowRadius: 6, shadowOpacity: 0.9)
- 5x5px rounded dots beneath dates
- Event types:
  - 🟣 **Purple (#A855F7)** - Active conversation loop
  - 🟡 **Gold (#F59E0B)** - Scheduled high-stakes talk
  - 🔵 **Blue (#3B82F6)** - Reflection logged
  - 🟠 **Red-Orange (#F97316)** - Emotional spike day

**Legend Pills**
- Frosted glass pills with gradient event dots
- Semi-transparent backgrounds matching calendar cells
- Horizontal scrollable layout

#### Calendar Home Screen (Monthly View with Event Types)
A full-screen monthly calendar showing your emotional timeline with **glowing event type indicators**:
- **Home button** (top-right) - Quick return to welcome screen
- **Calm, air-like UI motion** - Slow, soft animations
- **No hard lines** - Everything blends with soft borders and gradients
- **Month navigation** with arrow buttons
- **Legend** showing all intention types with gradient dots
- **Multiple events per day** - shows unique event types (up to 3 dots + counter)
- Tap any date to open **Day Detail Drawer**

#### Day Detail Drawer (Slide-Up Bottom Sheet with Blur-Glass)
When you tap a date with events, a beautiful drawer slides up with **blur-glass background**:

**Background Style**
- Dark backdrop with gradient overlay (rgba(5, 6, 8, 0.75) → rgba(10, 10, 12, 0.85))
- Drawer background: `rgba(10, 10, 12, 0.85)` for frosted glass effect
- Soft borders with cool gray accents (`rgba(156, 163, 175, 0.15)`)
- Deep shadow for depth (shadowRadius: 24, shadowOpacity: 0.5)

**Header**
- Soft handle bar in translucent gray
- Full formatted date (e.g., "Monday, December 10, 2025")
- Event count indicator
- Minimal border separator

**Event Cards** (for each event that day)
- **Frosted glass cards** with semi-transparent backgrounds
- **Event Type Badge** - Icon + label with colored glow
  - Icons: chatbubbles (loop), calendar (scheduled), bulb (reflection), pulse (spike)
- **Status Indicator** - Color-coded pill badge
  - Green: "Complete"
  - Amber: "In Progress"
  - Gray: "Upcoming"
- **Title** - Auto-generated from chat loop or user-provided
- **Tag Chips** - Frosted glass tags with soft borders
- **Intention Indicator** - Small colored dot + label + timestamp
- **Action Buttons** (frosted glass style):
  - **"Open Chat Loop"** (blue, rgba(59, 130, 246, 0.15))
  - **"Add Reflection"** (purple, rgba(168, 85, 247, 0.15))
  - **Reflection Status** (green, rgba(16, 185, 129, 0.1))

**Interaction**
- Smooth spring animations with staggered card entrance (50ms delay per card)
- Tap outside or swipe down to dismiss
- Scrollable list for days with many events
- Calm, slow UI pacing

#### Reflection Logging Modal
After a date passes, add reflections via the drawer's "Add Reflection" button:

**Clarity Score Slider** (1-10)
- Large color-coded display:
  - 1-3: Red (Confused)
  - 4-6: Amber (Unclear)
  - 7-10: Green (Very Clear)
- Smooth slider with purple accent
- Labels: "Confused" ←→ "Very Clear"

**Outcome Summary**
- Multi-line text input (4 lines)
- Placeholder: "e.g., We talked it through and agreed to check in weekly..."
- Dark input with neutral borders

**Actions**
- Cancel button (neutral gray)
- Save Reflection button (purple with glow)

**Design**
- Purple accent throughout
- Modal with rounded corners and shadow
- Smooth spring animations

#### Event Metadata Tracking
Each calendar entry now includes:
- **Event Type** - active-loop, scheduled-talk, reflection, emotional-spike
- **Status** - upcoming, in-progress, completed
- **Title** - Auto from loop or custom
- **Tags** - Custom categorization (family, romantic, work, etc.)
- **Clarity Score** - 1-10 rating from reflection
- **Reflection Notes** - Post-event summary
- **Loop ID** - Direct link to conversation thread

#### Calendar as Emotional Journal
The enhanced calendar becomes a comprehensive journal tracking:
- **Communication patterns** over time
- **Emotional growth** through clarity scores
- **Conversation outcomes** via reflections
- **Relationship trajectories** with linked loops
- **Pattern recognition** through event type visualization

#### Design Aesthetic
✨ **Dark luxury mood with glowing event indicators**

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
│   │   ├── FaceScanPromptBubble.tsx     # NEW: Tappable prompt for face scan
│   │   ├── EmotionalFaceScanBubble.tsx  # NEW: Expandable face scan card with minimize
│   │   └── LoopHistoryPanel.tsx    # Past loops drawer
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Stack navigation (no tabs)
│   ├── screens/
│   │   ├── InputScreen.tsx         # Welcome screen with menu access
│   │   ├── ChatScreen.tsx          # Main chat interface
│   │   ├── AnalysisScreen.tsx      # NEW: Step 1 - Full analysis display
│   │   ├── RelationshipDirectionScreen.tsx  # NEW: Step 2 - Direction selector
│   │   ├── SuggestionsScreen.tsx   # NEW: Step 3 - Tailored guidance
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

## Development

The app runs on Expo SDK 53 and is automatically served on port 8081.

**Important**: This is a mobile-first design optimized for iOS (iPhone 16 Pro Max), with full support for Android as well.

