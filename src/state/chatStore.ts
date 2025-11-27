import { create } from "zustand";
import { ChatMessage } from "../types/chat";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentInput: string;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentInput: (input: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  currentInput: "",

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setIsLoading: (loading) =>
    set({ isLoading: loading }),

  setCurrentInput: (input) =>
    set({ currentInput: input }),

  clearMessages: () =>
    set({ messages: [] }),
}));
