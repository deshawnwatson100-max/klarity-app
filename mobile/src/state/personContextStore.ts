import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PersonContext,
  PersonContextNote,
  PersonContextTag,
  PersonContextInsight,
  UserPerceptionState,
  ActivePersonContextSelection,
  RelationshipContextType,
  PerceptionFeeling,
  ContextAnchorType,
  DeepSearchExtendedContext,
  createPersonContext,
  createPersonContextNote,
  createPerceptionState,
} from "../types/personContext";

/**
 * Person Context Store
 *
 * Manages all person context data for Klarity AI.
 *
 * STORAGE STRATEGY:
 * - Local-first: All data persisted to AsyncStorage
 * - Privacy-by-default: Data stays on device unless user explicitly syncs
 * - Partitioned: Only essential data persisted (no transient UI state)
 *
 * PRIVACY DEFAULTS:
 * - All person contexts are local-only by default
 * - No automatic cloud sync
 * - User controls what (if anything) leaves the device
 * - Archived contexts hidden but not deleted (user control)
 *
 * FUTURE CLOUD SYNC (opt-in):
 * - Would require explicit user consent
 * - End-to-end encryption required
 * - User can select which contexts to sync
 */

interface PersonContextState {
  // State
  personContexts: PersonContext[];
  activePersonContextId: string | null;
  activeSelectedAt: string | null;
  isContextPaused: boolean; // NEW: Pause using context

  // Privacy settings
  privacySettings: {
    cloudSyncEnabled: boolean; // Default: false
    syncedPersonContextIds: string[]; // Which contexts user opted to sync
  };

  // Getters
  getPersonContextById: (id: string) => PersonContext | undefined;
  getActivePersonContext: () => PersonContext | null;
  getPersonContextsByRelationship: (
    relationshipContext: RelationshipContextType
  ) => PersonContext[];
  getArchivedContexts: () => PersonContext[];
  getNonArchivedContexts: () => PersonContext[];

  // Actions - Person Context CRUD
  createPersonContext: (
    name: string,
    relationshipContext: RelationshipContextType,
    userIntent?: string,
    deepSearchContext?: {
      location?: string;
      contextAnchor?: { type: ContextAnchorType; value: string };
      knownUsername?: string;
      approximateAge?: string;
      extendedContext?: DeepSearchExtendedContext;
      profileImageUri?: string;
    }
  ) => string; // Returns new ID
  updatePersonContext: (
    id: string,
    updates: Partial<
      Pick<PersonContext, "name" | "relationshipContext" | "customRelationshipLabel" | "userIntent" | "location" | "contextAnchor" | "knownUsername" | "approximateAge" | "extendedContext" | "profileImageUri">
    >
  ) => void;
  updatePersonContextImage: (id: string, imageUri: string | undefined) => void;
  deletePersonContext: (id: string) => void;
  archivePersonContext: (id: string) => void;
  unarchivePersonContext: (id: string) => void;

  // Actions - Active Selection
  setActivePersonContext: (id: string | null) => void;
  clearActivePersonContext: () => void;
  pauseContext: () => void;
  resumeContext: () => void;
  toggleContextPause: () => void;

  // Actions - Notes Management
  addNote: (personContextId: string, content: string, tagIds?: string[]) => string; // Returns note ID
  updateNote: (personContextId: string, noteId: string, content: string, tagIds?: string[]) => void;
  deleteNote: (personContextId: string, noteId: string) => void;
  addNoteFromChatContext: (personContextId: string, content: string, tagIds?: string[]) => string;

  // Actions - Tags Management
  addTag: (personContextId: string, label: string, color?: string) => string; // Returns tag ID
  updateTag: (personContextId: string, tagId: string, label: string, color?: string) => void;
  deleteTag: (personContextId: string, tagId: string) => void;

  // Actions - Perception State
  recordPerception: (
    personContextId: string,
    feeling: PerceptionFeeling,
    note?: string
  ) => void;
  getLatestPerception: (personContextId: string) => UserPerceptionState | null;

  // Actions - Insights (generated summaries)
  setInsight: (personContextId: string, insight: PersonContextInsight) => void;
  clearInsight: (personContextId: string) => void;

  // Actions - Privacy
  enableCloudSync: (enabled: boolean) => void;
  togglePersonContextSync: (personContextId: string, enabled: boolean) => void;

  // Utility
  resetStore: () => void;
}

const initialPrivacySettings = {
  cloudSyncEnabled: false,
  syncedPersonContextIds: [],
};

export const usePersonContextStore = create<PersonContextState>()(
  persist(
    (set, get) => ({
      // Initial State
      personContexts: [],
      activePersonContextId: null,
      activeSelectedAt: null,
      isContextPaused: false,
      privacySettings: initialPrivacySettings,

      // Getters
      getPersonContextById: (id: string) => {
        return get().personContexts.find((pc) => pc.id === id);
      },

      getActivePersonContext: () => {
        const state = get();
        if (!state.activePersonContextId) return null;
        return (
          state.personContexts.find((pc) => pc.id === state.activePersonContextId) || null
        );
      },

      getPersonContextsByRelationship: (relationshipContext: RelationshipContextType) => {
        return get().personContexts.filter(
          (pc) => pc.relationshipContext === relationshipContext && !pc.isArchived
        );
      },

      getArchivedContexts: () => {
        return get().personContexts.filter((pc) => pc.isArchived);
      },

      getNonArchivedContexts: () => {
        return get().personContexts.filter((pc) => !pc.isArchived);
      },

      // Person Context CRUD
      createPersonContext: (
        name: string,
        relationshipContext: RelationshipContextType,
        userIntent?: string,
        deepSearchContext?: {
          location?: string;
          contextAnchor?: { type: ContextAnchorType; value: string };
          knownUsername?: string;
          approximateAge?: string;
          extendedContext?: DeepSearchExtendedContext;
          profileImageUri?: string;
        }
      ) => {
        const newContext = createPersonContext(name, relationshipContext);
        if (userIntent) {
          newContext.userIntent = userIntent;
        }
        if (deepSearchContext) {
          if (deepSearchContext.location) {
            newContext.location = deepSearchContext.location;
          }
          if (deepSearchContext.contextAnchor) {
            newContext.contextAnchor = deepSearchContext.contextAnchor;
          }
          if (deepSearchContext.knownUsername) {
            newContext.knownUsername = deepSearchContext.knownUsername;
          }
          if (deepSearchContext.approximateAge) {
            newContext.approximateAge = deepSearchContext.approximateAge;
          }
          if (deepSearchContext.extendedContext) {
            newContext.extendedContext = deepSearchContext.extendedContext;
          }
          if (deepSearchContext.profileImageUri) {
            newContext.profileImageUri = deepSearchContext.profileImageUri;
          }
        }

        set((state) => ({
          personContexts: [newContext, ...state.personContexts],
        }));

        return newContext.id;
      },

      updatePersonContext: (id, updates) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === id
              ? { ...pc, ...updates, updatedAt: new Date().toISOString() }
              : pc
          ),
        }));
      },

      updatePersonContextImage: (id: string, imageUri: string | undefined) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === id
              ? { ...pc, profileImageUri: imageUri, updatedAt: new Date().toISOString() }
              : pc
          ),
        }));
      },

      deletePersonContext: (id: string) => {
        set((state) => {
          const newContexts = state.personContexts.filter((pc) => pc.id !== id);
          return {
            personContexts: newContexts,
            // Clear active if deleted
            activePersonContextId:
              state.activePersonContextId === id ? null : state.activePersonContextId,
            activeSelectedAt:
              state.activePersonContextId === id ? null : state.activeSelectedAt,
          };
        });
      },

      archivePersonContext: (id: string) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === id
              ? { ...pc, isArchived: true, updatedAt: new Date().toISOString() }
              : pc
          ),
          // Clear active if archived
          activePersonContextId:
            state.activePersonContextId === id ? null : state.activePersonContextId,
          activeSelectedAt:
            state.activePersonContextId === id ? null : state.activeSelectedAt,
        }));
      },

      unarchivePersonContext: (id: string) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === id
              ? { ...pc, isArchived: false, updatedAt: new Date().toISOString() }
              : pc
          ),
        }));
      },

      // Active Selection
      setActivePersonContext: (id: string | null) => {
        set({
          activePersonContextId: id,
          activeSelectedAt: id ? new Date().toISOString() : null,
        });
      },

      clearActivePersonContext: () => {
        set({
          activePersonContextId: null,
          activeSelectedAt: null,
        });
      },

      pauseContext: () => {
        set({ isContextPaused: true });
      },

      resumeContext: () => {
        set({ isContextPaused: false });
      },

      toggleContextPause: () => {
        set((state) => ({ isContextPaused: !state.isContextPaused }));
      },

      // Notes Management
      addNote: (personContextId: string, content: string, tagIds: string[] = []) => {
        const newNote = createPersonContextNote(content, "user_input", tagIds);

        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  notes: [...pc.notes, newNote],
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));

        return newNote.id;
      },

      updateNote: (
        personContextId: string,
        noteId: string,
        content: string,
        tagIds?: string[]
      ) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  notes: pc.notes.map((note) =>
                    note.id === noteId
                      ? {
                          ...note,
                          content,
                          tagIds: tagIds ?? note.tagIds,
                          updatedAt: new Date().toISOString(),
                        }
                      : note
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));
      },

      deleteNote: (personContextId: string, noteId: string) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  notes: pc.notes.filter((note) => note.id !== noteId),
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));
      },

      addNoteFromChatContext: (
        personContextId: string,
        content: string,
        tagIds: string[] = []
      ) => {
        const newNote = createPersonContextNote(content, "chat_context", tagIds);

        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  notes: [...pc.notes, newNote],
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));

        return newNote.id;
      },

      // Tags Management
      addTag: (personContextId: string, label: string, color?: string) => {
        const newTag: PersonContextTag = {
          id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          label,
          color,
        };

        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  tags: [...pc.tags, newTag],
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));

        return newTag.id;
      },

      updateTag: (
        personContextId: string,
        tagId: string,
        label: string,
        color?: string
      ) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  tags: pc.tags.map((tag) =>
                    tag.id === tagId ? { ...tag, label, color } : tag
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));
      },

      deleteTag: (personContextId: string, tagId: string) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  tags: pc.tags.filter((tag) => tag.id !== tagId),
                  // Also remove tag from all notes
                  notes: pc.notes.map((note) => ({
                    ...note,
                    tagIds: note.tagIds.filter((id) => id !== tagId),
                  })),
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));
      },

      // Perception State
      recordPerception: (
        personContextId: string,
        feeling: PerceptionFeeling,
        note?: string
      ) => {
        const perception = createPerceptionState(feeling, note);

        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  perceptionHistory: [...pc.perceptionHistory, perception],
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));
      },

      getLatestPerception: (personContextId: string) => {
        const context = get().getPersonContextById(personContextId);
        if (!context || context.perceptionHistory.length === 0) return null;
        return context.perceptionHistory[context.perceptionHistory.length - 1];
      },

      // Insights
      setInsight: (personContextId: string, insight: PersonContextInsight) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  currentInsight: insight,
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));
      },

      clearInsight: (personContextId: string) => {
        set((state) => ({
          personContexts: state.personContexts.map((pc) =>
            pc.id === personContextId
              ? {
                  ...pc,
                  currentInsight: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : pc
          ),
        }));
      },

      // Privacy
      enableCloudSync: (enabled: boolean) => {
        set((state) => ({
          privacySettings: {
            ...state.privacySettings,
            cloudSyncEnabled: enabled,
            // Clear synced IDs if disabling
            syncedPersonContextIds: enabled
              ? state.privacySettings.syncedPersonContextIds
              : [],
          },
        }));
      },

      togglePersonContextSync: (personContextId: string, enabled: boolean) => {
        set((state) => ({
          privacySettings: {
            ...state.privacySettings,
            syncedPersonContextIds: enabled
              ? [...state.privacySettings.syncedPersonContextIds, personContextId]
              : state.privacySettings.syncedPersonContextIds.filter(
                  (id) => id !== personContextId
                ),
          },
        }));
      },

      // Utility
      resetStore: () => {
        set({
          personContexts: [],
          activePersonContextId: null,
          activeSelectedAt: null,
          isContextPaused: false,
          privacySettings: initialPrivacySettings,
        });
      },
    }),
    {
      name: "klarity-person-context-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: (state) => ({
        personContexts: state.personContexts,
        activePersonContextId: state.activePersonContextId,
        activeSelectedAt: state.activeSelectedAt,
        isContextPaused: state.isContextPaused,
        privacySettings: state.privacySettings,
      }),
    }
  )
);

/**
 * Custom hooks for common operations
 */

/**
 * Hook to get active person context (safe selector)
 */
export function useActivePersonContext() {
  const activeId = usePersonContextStore((s) => s.activePersonContextId);
  const getById = usePersonContextStore((s) => s.getPersonContextById);
  return activeId ? getById(activeId) : null;
}

/**
 * Hook to check if a person context is active
 */
export function useIsPersonContextActive(personContextId: string) {
  const activeId = usePersonContextStore((s) => s.activePersonContextId);
  return activeId === personContextId;
}

/**
 * Hook to get non-archived contexts count
 */
export function usePersonContextCount() {
  return usePersonContextStore((s) => s.personContexts.filter((pc) => !pc.isArchived).length);
}

/**
 * Hook to check if context is paused
 */
export function useIsContextPaused() {
  return usePersonContextStore((s) => s.isContextPaused);
}

/**
 * Hook to get effective active context (null if paused)
 * Use this when you want to respect the pause state
 */
export function useEffectiveActiveContext() {
  const activeId = usePersonContextStore((s) => s.activePersonContextId);
  const isPaused = usePersonContextStore((s) => s.isContextPaused);
  const getById = usePersonContextStore((s) => s.getPersonContextById);

  if (isPaused || !activeId) return null;
  return getById(activeId) || null;
}
