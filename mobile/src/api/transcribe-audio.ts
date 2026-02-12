/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom audio transcription service that routes through the backend.
The OpenAI API key is stored securely on the server - never exposed to the mobile app.
*/

import { getBackendUrl } from "../lib/config";
import { APP_CLIENT_KEY } from "./openai";

/**
 * Transcribe an audio file
 * @param localAudioUri - The local URI of the audio file to transcribe. Obtained via the expo-av library.
 * @returns The text of the audio file
 */
export const transcribeAudio = async (localAudioUri: string): Promise<string> => {
  try {
    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/api/transcribe`;

    console.log("[Transcribe] Making request to backend:", url);

    // Create FormData for the audio file
    const formData = new FormData();

    // React Native requires this specific format for file uploads
    const fileUri = localAudioUri.startsWith("file://") ? localAudioUri : `file://${localAudioUri}`;

    formData.append("file", {
      uri: fileUri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as unknown as Blob);
    formData.append("model", "gpt-4o-transcribe");

    // API call to backend transcription endpoint
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-APP-KEY": APP_CLIENT_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Transcribe] Backend error:", errorData);
      throw new Error(
        (errorData as { message?: string })?.message || `Transcription failed: ${response.status}`
      );
    }

    const result = (await response.json()) as { text: string; requestId?: string };
    console.log("[Transcribe] Success, text length:", result.text?.length || 0);
    return result.text;
  } catch (error) {
    console.error("[Transcribe] Error:", error);
    throw error;
  }
};
