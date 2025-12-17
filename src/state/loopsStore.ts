import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KlarityLoop, TrackedRelationship, createNewLoop, generateLoopTitle } from "../types/loop";
import { ChatMessage, AnalysisMessage } from "../types/chat";

/**
 * Loops Store
 *
 * Manages all conversation loops (sessions) for Klarity AI.
 * - Persists loops to AsyncStorage so they survive app restarts
 * - Tracks the currently active loop
 * - Provides actions to create, switch, update, and delete loops
 * - Manages tracked relationships for long-term clarity
 *
 * Storage Strategy:
 * - Only loop metadata and messages are persisted
 * - Active loop ID is persisted to restore the last conversation on app launch
 * - Tracked relationships are persisted
 *
 * To add new fields to a loop later:
 * 1. Update the KlarityLoop interface in types/loop.ts
 * 2. Add any necessary actions here to update those fields
 * 3. Update the LoopHistoryPanel component to display new fields
 */

interface LoopsState {
  // State
  loops: KlarityLoop[]; // All saved loops
  activeLoopId: string | null; // ID of the currently active loop
  isHistoryPanelOpen: boolean; // Whether the history drawer is open
  trackedRelationships: TrackedRelationship[]; // Tracked relationships for long-term clarity

  // Getters
  getActiveLoop: () => KlarityLoop | null;
  getLoopById: (id: string) => KlarityLoop | undefined;
  getRelationshipById: (id: string) => TrackedRelationship | undefined;
  getLoopsForRelationship: (relationshipId: string) => KlarityLoop[];

  // Actions - Loop Management
  createNewLoop: () => string; // Returns the new loop ID
  switchToLoop: (loopId: string) => void;
  deleteLoop: (loopId: string) => void;
  updateLoopTitle: (loopId: string, title: string) => void;

  // Actions - Message Management
  addMessageToActiveLoop: (message: ChatMessage) => void;
  insertMessageAfter: (afterMessageId: string, message: ChatMessage) => void;
  removeMessageFromActiveLoop: (messageId: string) => void;
  updateMessageInActiveLoop: (messageId: string, updatedMessage: ChatMessage) => void;
  setActiveLoopMessages: (messages: ChatMessage[]) => void;
  clearActiveLoopMessages: () => void;

  // Actions - History Panel
  setHistoryPanelOpen: (open: boolean) => void;
  toggleHistoryPanel: () => void;

  // Actions - Relationship Tracking
  createRelationship: (name: string) => string; // Returns the new relationship ID
  deleteRelationship: (relationshipId: string) => void;
  linkLoopToRelationship: (loopId: string, relationshipId: string) => void;
  unlinkLoopFromRelationship: (loopId: string) => void;
}

export const useLoopsStore = create<LoopsState>()(
  persist(
    (set, get) => ({
      // Initial State
      loops: [],
      activeLoopId: null,
      isHistoryPanelOpen: false,
      trackedRelationships: [],

      // Getters
      getActiveLoop: () => {
        const state = get();
        if (!state.activeLoopId) return null;
        return state.loops.find((loop) => loop.id === state.activeLoopId) || null;
      },

      getLoopById: (id: string) => {
        return get().loops.find((loop) => loop.id === id);
      },

      getRelationshipById: (id: string) => {
        return get().trackedRelationships.find((rel) => rel.id === id);
      },

      getLoopsForRelationship: (relationshipId: string) => {
        const state = get();
        return state.loops.filter((loop) => loop.relationshipId === relationshipId);
      },

      // Loop Management Actions
      createNewLoop: () => {
        const newLoop = createNewLoop();
        set((state) => ({
          loops: [newLoop, ...state.loops], // Add to beginning (most recent first)
          activeLoopId: newLoop.id,
        }));
        return newLoop.id;
      },

      switchToLoop: (loopId: string) => {
        const loop = get().getLoopById(loopId);
        if (loop) {
          set({ activeLoopId: loopId, isHistoryPanelOpen: false });
        }
      },

      deleteLoop: (loopId: string) => {
        set((state) => {
          const newLoops = state.loops.filter((loop) => loop.id !== loopId);

          // If we deleted the active loop, switch to most recent or create new
          let newActiveLoopId = state.activeLoopId;
          if (state.activeLoopId === loopId) {
            if (newLoops.length > 0) {
              newActiveLoopId = newLoops[0].id;
            } else {
              // No loops left, create a new one
              const newLoop = createNewLoop();
              return {
                loops: [newLoop],
                activeLoopId: newLoop.id,
              };
            }
          }

          return {
            loops: newLoops,
            activeLoopId: newActiveLoopId,
          };
        });
      },

      updateLoopTitle: (loopId: string, title: string) => {
        set((state) => ({
          loops: state.loops.map((loop) =>
            loop.id === loopId
              ? { ...loop, title, updatedAt: new Date().toISOString() }
              : loop
          ),
        }));
      },

      // Message Management Actions
      addMessageToActiveLoop: (message: ChatMessage) => {
        set((state) => {
          const activeLoop = state.loops.find(
            (loop) => loop.id === state.activeLoopId
          );

          if (!activeLoop) return state;

          // Auto-generate title from first user message
          let newTitle = activeLoop.title;
          if (
            activeLoop.messages.length === 0 &&
            message.role === "user" &&
            activeLoop.title === "New Conversation"
          ) {
            newTitle = generateLoopTitle(message.content);
          }

          // Extract emotional clarity from analysis messages
          let emotionalClarity = activeLoop.emotionalClarity;
          if (message.role === "analysis") {
            const analysisMsg = message as AnalysisMessage;
            emotionalClarity = analysisMsg.analysis.emotionalClarity;
          }

          return {
            loops: state.loops.map((loop) =>
              loop.id === state.activeLoopId
                ? {
                    ...loop,
                    title: newTitle,
                    messages: [...loop.messages, message],
                    updatedAt: new Date().toISOString(),
                    emotionalClarity,
                  }
                : loop
            ),
          };
        });
      },

      insertMessageAfter: (afterMessageId: string, message: ChatMessage) => {
        set((state) => {
          const activeLoop = state.loops.find(
            (loop) => loop.id === state.activeLoopId
          );

          if (!activeLoop) return state;

          // Find the index of the message to insert after
          const afterIndex = activeLoop.messages.findIndex(
            (msg) => msg.id === afterMessageId
          );

          if (afterIndex === -1) {
            // If message not found, append to end
            return {
              loops: state.loops.map((loop) =>
                loop.id === state.activeLoopId
                  ? {
                      ...loop,
                      messages: [...loop.messages, message],
                      updatedAt: new Date().toISOString(),
                    }
                  : loop
              ),
            };
          }

          // Insert the message right after the found message
          const newMessages = [
            ...activeLoop.messages.slice(0, afterIndex + 1),
            message,
            ...activeLoop.messages.slice(afterIndex + 1),
          ];

          return {
            loops: state.loops.map((loop) =>
              loop.id === state.activeLoopId
                ? {
                    ...loop,
                    messages: newMessages,
                    updatedAt: new Date().toISOString(),
                  }
                : loop
            ),
          };
        });
      },

      removeMessageFromActiveLoop: (messageId: string) => {
        set((state) => ({
          loops: state.loops.map((loop) =>
            loop.id === state.activeLoopId
              ? {
                  ...loop,
                  messages: loop.messages.filter((msg) => msg.id !== messageId),
                  updatedAt: new Date().toISOString(),
                }
              : loop
          ),
        }));
      },

      updateMessageInActiveLoop: (messageId: string, updatedMessage: ChatMessage) => {
        set((state) => ({
          loops: state.loops.map((loop) =>
            loop.id === state.activeLoopId
              ? {
                  ...loop,
                  messages: loop.messages.map((msg) =>
                    msg.id === messageId ? updatedMessage : msg
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : loop
          ),
        }));
      },

      setActiveLoopMessages: (messages: ChatMessage[]) => {
        set((state) => ({
          loops: state.loops.map((loop) =>
            loop.id === state.activeLoopId
              ? { ...loop, messages, updatedAt: new Date().toISOString() }
              : loop
          ),
        }));
      },

      clearActiveLoopMessages: () => {
        set((state) => ({
          loops: state.loops.map((loop) =>
            loop.id === state.activeLoopId
              ? { ...loop, messages: [], updatedAt: new Date().toISOString() }
              : loop
          ),
        }));
      },

      // History Panel Actions
      setHistoryPanelOpen: (open: boolean) => {
        set({ isHistoryPanelOpen: open });
      },

      toggleHistoryPanel: () => {
        set((state) => ({ isHistoryPanelOpen: !state.isHistoryPanelOpen }));
      },

      // Relationship Tracking Actions
      createRelationship: (name: string) => {
        const newRelationship: TrackedRelationship = {
          id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          createdAt: new Date().toISOString(),
          loopIds: [],
        };
        set((state) => ({
          trackedRelationships: [...state.trackedRelationships, newRelationship],
        }));
        return newRelationship.id;
      },

      deleteRelationship: (relationshipId: string) => {
        set((state) => ({
          trackedRelationships: state.trackedRelationships.filter(
            (rel) => rel.id !== relationshipId
          ),
          // Also unlink any loops from this relationship
          loops: state.loops.map((loop) =>
            loop.relationshipId === relationshipId
              ? { ...loop, relationshipId: undefined }
              : loop
          ),
        }));
      },

      linkLoopToRelationship: (loopId: string, relationshipId: string) => {
        set((state) => ({
          loops: state.loops.map((loop) =>
            loop.id === loopId
              ? { ...loop, relationshipId, updatedAt: new Date().toISOString() }
              : loop
          ),
          trackedRelationships: state.trackedRelationships.map((rel) =>
            rel.id === relationshipId && !rel.loopIds.includes(loopId)
              ? { ...rel, loopIds: [...rel.loopIds, loopId] }
              : rel
          ),
        }));
      },

      unlinkLoopFromRelationship: (loopId: string) => {
        const loop = get().getLoopById(loopId);
        if (!loop?.relationshipId) return;

        const relationshipId = loop.relationshipId;
        set((state) => ({
          loops: state.loops.map((l) =>
            l.id === loopId
              ? { ...l, relationshipId: undefined, updatedAt: new Date().toISOString() }
              : l
          ),
          trackedRelationships: state.trackedRelationships.map((rel) =>
            rel.id === relationshipId
              ? { ...rel, loopIds: rel.loopIds.filter((id) => id !== loopId) }
              : rel
          ),
        }));
      },
    }),
    {
      name: "klarity-loops-storage", // Storage key in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      // Persist loops, activeLoopId, and tracked relationships
      partialize: (state) => ({
        loops: state.loops,
        activeLoopId: state.activeLoopId,
        trackedRelationships: state.trackedRelationships,
      }),
    }
  )
);
