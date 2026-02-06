import React, { useState, memo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import {
  usePersonContextStore,
} from "../state/personContextStore";
import {
  useLoopsStore,
} from "../state/loopsStore";
import {
  DeepSearchSuggestionState,
  DeepSearchResultMessage,
} from "../types/chat";
import { RelationshipContextType, ContextAnchorType } from "../types/personContext";
import {
  DeepSearchResultBubble,
} from "./DeepSearchResultBubble";
import { ChatLoadingBubble } from "./ChatLoadingBubble";

// ChatGPT-style colors - matching the app aesthetic
const COLORS = {
  text: "#EDEDED",
  textSecondary: "#A0A0A0",
  textMuted: "#6B7280",
  link: "#60A5FA",
  success: "#10B981",
  error: "#EF4444",
  buttonBg: "rgba(255, 255, 255, 0.08)",
  buttonBgHover: "rgba(255, 255, 255, 0.12)",
  inputBg: "rgba(255, 255, 255, 0.05)",
  accent: "#10A37F",
  accentBg: "rgba(16, 163, 127, 0.15)",
  errorBg: "rgba(239, 68, 68, 0.15)",
};

const RELATIONSHIP_OPTIONS: {
  value: RelationshipContextType;
  label: string;
}[] = [
  { value: "dating", label: "Dating" },
  { value: "romantic", label: "Partner" },
  { value: "work", label: "Work" },
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

const CONTEXT_ANCHOR_OPTIONS: {
  type: ContextAnchorType;
  label: string;
  placeholder: string;
}[] = [
  { type: "workplace", label: "Workplace", placeholder: "e.g. Tech startup, Hospital" },
  { type: "school", label: "School", placeholder: "e.g. UCLA, Local high school" },
  { type: "dating_app", label: "Dating app", placeholder: "e.g. Hinge, Bumble" },
  { type: "username", label: "Username", placeholder: "e.g. @handle" },
];

interface DeepSearchSuggestionCardProps {
  messageId: string;
  initialState?: DeepSearchSuggestionState;
  existingPersonContextId?: string;
  searchResult?: DeepSearchResultMessage["searchResult"];
  errorMessage?: string;
  showLinkOption?: boolean;
  onRunDeepSearch: (personContextId: string, linkedToChat: boolean) => void;
  onDismiss: () => void;
  onUpdateState: (state: DeepSearchSuggestionState) => void;
}

export const DeepSearchSuggestionCard = memo(function DeepSearchSuggestionCard({
  messageId,
  initialState = "collapsed",
  existingPersonContextId,
  searchResult,
  errorMessage,
  showLinkOption = false,
  onRunDeepSearch,
  onDismiss,
  onUpdateState,
}: DeepSearchSuggestionCardProps) {
  const createPersonContext = usePersonContextStore((s) => s.createPersonContext);
  const getPersonContextById = usePersonContextStore((s) => s.getPersonContextById);
  const setActiveLoopPersonContext = useLoopsStore((s) => s.setActiveLoopPersonContext);

  // Card state
  const [cardState, setCardState] = useState<DeepSearchSuggestionState>(initialState);

  // Form state
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContextType | null>(null);
  const [location, setLocation] = useState("");
  const [selectedAnchorType, setSelectedAnchorType] = useState<ContextAnchorType | null>(null);
  const [anchorValue, setAnchorValue] = useState("");
  const [showBoost, setShowBoost] = useState(false);
  const [knownUsername, setKnownUsername] = useState("");
  const [approximateAge, setApproximateAge] = useState("");
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>(undefined);
  const [linkToChat, setLinkToChat] = useState(true);

  const isFormValid = name.trim().length > 0 && relationshipContext !== null;

  const existingPersonContext = existingPersonContextId
    ? getPersonContextById(existingPersonContextId)
    : null;

  const handleRunDeepSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (existingPersonContext) {
      setCardState("running");
      onUpdateState("running");
      onRunDeepSearch(existingPersonContext.id, true);
    } else {
      setCardState("input");
      onUpdateState("input");
    }
  }, [existingPersonContext, onRunDeepSearch, onUpdateState]);

  const handleNotNow = useCallback(() => {
    Haptics.selectionAsync();
    onDismiss();
  }, [onDismiss]);

  const handlePickImage = async () => {
    Haptics.selectionAsync();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImageUri(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleStartDeepSearch = useCallback(() => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    const deepSearchContext: {
      location?: string;
      contextAnchor?: { type: ContextAnchorType; value: string };
      knownUsername?: string;
      approximateAge?: string;
      profileImageUri?: string;
    } = {};

    if (location.trim()) {
      deepSearchContext.location = location.trim();
    }
    if (selectedAnchorType && anchorValue.trim()) {
      deepSearchContext.contextAnchor = {
        type: selectedAnchorType,
        value: anchorValue.trim(),
      };
    }
    if (knownUsername.trim()) {
      deepSearchContext.knownUsername = knownUsername.trim();
    }
    if (approximateAge.trim()) {
      deepSearchContext.approximateAge = approximateAge.trim();
    }
    if (profileImageUri) {
      deepSearchContext.profileImageUri = profileImageUri;
    }

    const newId = createPersonContext(
      name.trim(),
      relationshipContext!,
      undefined,
      Object.keys(deepSearchContext).length > 0 ? deepSearchContext : undefined
    );

    const shouldLink = !showLinkOption || linkToChat;
    if (shouldLink) {
      setActiveLoopPersonContext(newId);
    }
    setCardState("running");
    onUpdateState("running");
    onRunDeepSearch(newId, shouldLink);
  }, [
    isFormValid,
    name,
    relationshipContext,
    location,
    selectedAnchorType,
    anchorValue,
    knownUsername,
    approximateAge,
    profileImageUri,
    showLinkOption,
    linkToChat,
    createPersonContext,
    setActiveLoopPersonContext,
    onUpdateState,
    onRunDeepSearch,
  ]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (existingPersonContextId) {
      setCardState("running");
      onUpdateState("running");
      onRunDeepSearch(existingPersonContextId, true);
    } else {
      setCardState("input");
      onUpdateState("input");
    }
  }, [existingPersonContextId, onRunDeepSearch, onUpdateState]);

  const handleEditDetails = useCallback(() => {
    Haptics.selectionAsync();
    setCardState("input");
    onUpdateState("input");
  }, [onUpdateState]);

  // Collapsed state - ChatGPT style suggestion
  if (cardState === "collapsed") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify()}
        style={{ marginBottom: 24 }}
      >
        <Text
          style={{
            fontSize: 17,
            lineHeight: 26,
            color: COLORS.text,
            letterSpacing: 0.2,
            marginBottom: 16,
          }}
        >
          I can search for publicly available information about this person if that would help. Would you like me to run a deep search?
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={handleRunDeepSearch}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: pressed ? COLORS.buttonBgHover : COLORS.buttonBg,
            })}
          >
            <Ionicons name="search" size={16} color={COLORS.link} />
            <Text style={{ color: COLORS.link, fontSize: 14, fontWeight: "500", marginLeft: 8 }}>
              Run Deep Search
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNotNow}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: pressed ? COLORS.buttonBgHover : "transparent",
            })}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
              Not now
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // Input form - ChatGPT style inline form
  if (cardState === "input") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
        style={{ marginBottom: 24 }}
      >
        {/* Intro text */}
        <Text
          style={{
            fontSize: 17,
            lineHeight: 26,
            color: COLORS.text,
            letterSpacing: 0.2,
            marginBottom: 20,
          }}
        >
          Tell me a bit about who you are looking for and I will search for their public profiles.
        </Text>

        {/* Profile photo - optional */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: profileImageUri ? "transparent" : COLORS.buttonBg,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              opacity: pressed ? 0.8 : 1,
              marginRight: 12,
            })}
          >
            {profileImageUri ? (
              <Image
                source={{ uri: profileImageUri }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
              />
            ) : (
              <Ionicons name="camera-outline" size={22} color={COLORS.textMuted} />
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              Add a photo
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
              Optional - helps with visual matching
            </Text>
          </View>
        </View>

        {/* Name input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 }}>
            Name <Text style={{ color: COLORS.textMuted }}>*</Text>
          </Text>
          <TextInput
            style={{
              backgroundColor: COLORS.inputBg,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: COLORS.text,
            }}
            placeholder="Their name"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Relationship chips */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>
            How do you know them? <Text style={{ color: COLORS.textMuted }}>*</Text>
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {RELATIONSHIP_OPTIONS.map((option) => {
              const isSelected = relationshipContext === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRelationshipContext(option.value);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: isSelected ? COLORS.accentBg : COLORS.buttonBg,
                  }}
                >
                  <Text style={{ fontSize: 13, color: isSelected ? COLORS.success : COLORS.textSecondary }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Location input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 }}>
            Location
          </Text>
          <TextInput
            style={{
              backgroundColor: COLORS.inputBg,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: COLORS.text,
            }}
            placeholder="City or area"
            placeholderTextColor={COLORS.textMuted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Context anchor - inline chips */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>
            Any detail that might help
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: selectedAnchorType ? 10 : 0 }}>
            {CONTEXT_ANCHOR_OPTIONS.map((option) => {
              const isSelected = selectedAnchorType === option.type;
              return (
                <Pressable
                  key={option.type}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (isSelected) {
                      setSelectedAnchorType(null);
                      setAnchorValue("");
                    } else {
                      setSelectedAnchorType(option.type);
                    }
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 14,
                    backgroundColor: isSelected ? COLORS.accentBg : COLORS.buttonBg,
                  }}
                >
                  <Text style={{ fontSize: 12, color: isSelected ? COLORS.success : COLORS.textMuted }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedAnchorType && (
            <TextInput
              style={{
                backgroundColor: COLORS.inputBg,
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: COLORS.text,
              }}
              placeholder={CONTEXT_ANCHOR_OPTIONS.find(o => o.type === selectedAnchorType)?.placeholder}
              placeholderTextColor={COLORS.textMuted}
              value={anchorValue}
              onChangeText={setAnchorValue}
            />
          )}
        </View>

        {/* More details toggle */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowBoost(!showBoost);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: showBoost ? 16 : 0,
          }}
        >
          <Ionicons
            name={showBoost ? "chevron-down" : "chevron-forward"}
            size={14}
            color={COLORS.textMuted}
          />
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 4 }}>
            More details
          </Text>
        </Pressable>

        {showBoost && (
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 }}>
                Known username
              </Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.inputBg,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: COLORS.text,
                }}
                placeholder="@username"
                placeholderTextColor={COLORS.textMuted}
                value={knownUsername}
                onChangeText={setKnownUsername}
              />
            </View>
            <View>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 }}>
                Approximate age
              </Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.inputBg,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: COLORS.text,
                }}
                placeholder="e.g. Late 20s"
                placeholderTextColor={COLORS.textMuted}
                value={approximateAge}
                onChangeText={setApproximateAge}
              />
            </View>
          </View>
        )}

        {/* Link toggle */}
        {showLinkOption && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setLinkToChat(!linkToChat);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                backgroundColor: linkToChat ? COLORS.success : COLORS.buttonBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              {linkToChat && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
              Use this context in our conversation
            </Text>
          </Pressable>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
          <Pressable
            onPress={handleStartDeepSearch}
            disabled={!isFormValid}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: isFormValid
                ? pressed ? COLORS.buttonBgHover : COLORS.buttonBg
                : COLORS.buttonBg,
              opacity: isFormValid ? 1 : 0.5,
            })}
          >
            <Ionicons name="search" size={16} color={isFormValid ? COLORS.link : COLORS.textMuted} />
            <Text style={{ color: isFormValid ? COLORS.link : COLORS.textMuted, fontSize: 14, fontWeight: "500", marginLeft: 8 }}>
              Start Search
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNotNow}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: pressed ? COLORS.buttonBgHover : "transparent",
            })}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // Running state
  if (cardState === "running") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
      >
        <ChatLoadingBubble
          type="deep-search"
          state="loading"
          customAction={existingPersonContext ? `Searching for ${existingPersonContext.name}` : "Running deep search"}
        />
      </Animated.View>
    );
  }

  // Error state - ChatGPT style
  if (cardState === "error") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
        style={{ marginBottom: 24 }}
      >
        <Text
          style={{
            fontSize: 17,
            lineHeight: 26,
            color: COLORS.text,
            letterSpacing: 0.2,
            marginBottom: 16,
          }}
        >
          {errorMessage || "I was not able to complete the search. Would you like to try again?"}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: pressed ? COLORS.buttonBgHover : COLORS.buttonBg,
            })}
          >
            <Ionicons name="refresh" size={16} color={COLORS.link} />
            <Text style={{ color: COLORS.link, fontSize: 14, fontWeight: "500", marginLeft: 8 }}>
              Try again
            </Text>
          </Pressable>
          <Pressable
            onPress={handleEditDetails}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: pressed ? COLORS.buttonBgHover : "transparent",
            })}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
              Edit details
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // Results state
  if (cardState === "results" && searchResult) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
      >
        <DeepSearchResultBubble result={searchResult} showSafetyResources={false} />
      </Animated.View>
    );
  }

  return null;
});
