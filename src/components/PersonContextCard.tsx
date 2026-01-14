import React, { useState, memo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {
  usePersonContextStore,
} from "../state/personContextStore";
import {
  useLoopsStore,
} from "../state/loopsStore";
import { RelationshipContextType, ContextAnchorType, DeepSearchExtendedContext } from "../types/personContext";

// ChatGPT-style colors - minimal, borderless
const COLORS = {
  background: "#1A1A1A",
  surface: "#000000",
  surfaceHover: "#1A1A1A",
  border: "transparent",
  text: "#ECECEC",
  textSecondary: "#B4B4B4",
  textMuted: "#8E8E8E",
  accent: "#10A37F",
  accentBg: "rgba(16, 163, 127, 0.15)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.15)",
  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.15)",
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
  { type: "workplace", label: "Workplace or industry", placeholder: "e.g. Tech startup, Hospital" },
  { type: "school", label: "School", placeholder: "e.g. UCLA, Local high school" },
  { type: "dating_app", label: "Dating app you met on", placeholder: "e.g. Hinge, Bumble" },
  { type: "username", label: "Known username or handle", placeholder: "e.g. @handle" },
];

// Extracted input component to prevent re-renders
interface ChatBubbleInputProps {
  label: string;
  helperText: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
}

const ChatBubbleInput = memo(function ChatBubbleInput({
  label,
  helperText,
  placeholder,
  value,
  onChangeText,
  required = false,
}: ChatBubbleInputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
        {label}{required && <Text style={{ color: COLORS.textMuted }}> *</Text>}
      </Text>
      <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
        {helperText}
      </Text>
      <TextInput
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          color: COLORS.text,
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
});

interface PersonContextCardProps {
  onPersonContextCreated?: (personContextId: string, linkedToChat: boolean) => void;
  onDismiss?: () => void;
  /** If true, shows toggle for user to choose whether to link context to chat. Default: false (auto-links) */
  showLinkOption?: boolean;
}

export const PersonContextCard = memo(function PersonContextCard({
  onPersonContextCreated,
  onDismiss,
  showLinkOption = false,
}: PersonContextCardProps) {
  const createPersonContext = usePersonContextStore((s) => s.createPersonContext);
  const setActiveLoopPersonContext = useLoopsStore((s) => s.setActiveLoopPersonContext);

  // Form state
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContextType | null>(null);
  const [location, setLocation] = useState("");
  const [selectedAnchorType, setSelectedAnchorType] = useState<ContextAnchorType | null>(null);
  const [anchorValue, setAnchorValue] = useState("");
  const [showBoost, setShowBoost] = useState(false);
  const [approximateAge, setApproximateAge] = useState("");
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>(undefined);

  // Extended context fields for more thorough searches
  const [showExtendedDetails, setShowExtendedDetails] = useState(false);
  const [countyOrRegion, setCountyOrRegion] = useState("");
  const [middleNameOrInitial, setMiddleNameOrInitial] = useState("");
  const [previousLocation, setPreviousLocation] = useState("");
  const [professionalInfo, setProfessionalInfo] = useState("");
  const [knownAliases, setKnownAliases] = useState("");

  // Link to chat toggle state - default to true (linked)
  const [linkToChat, setLinkToChat] = useState(true);

  // Completed state
  const [isCompleted, setIsCompleted] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [savedRelationship, setSavedRelationship] = useState<RelationshipContextType | null>(null);
  const [savedLinkedToChat, setSavedLinkedToChat] = useState(true);

  const isFormValid = name.trim().length > 0 && relationshipContext !== null;

  // Image picker function
  const handlePickImage = async () => {
    Haptics.selectionAsync();

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photos to add a profile image."
      );
      return;
    }

    // Launch image picker
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

  const handleRemoveImage = () => {
    Haptics.selectionAsync();
    setProfileImageUri(undefined);
  };

  const handleSave = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    const deepSearchContext: {
      location?: string;
      contextAnchor?: { type: ContextAnchorType; value: string };
      knownUsername?: string;
      approximateAge?: string;
      extendedContext?: DeepSearchExtendedContext;
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
    if (approximateAge.trim()) {
      deepSearchContext.approximateAge = approximateAge.trim();
    }
    if (profileImageUri) {
      deepSearchContext.profileImageUri = profileImageUri;
    }

    // Build extended context if any fields are filled
    const extendedContext: DeepSearchExtendedContext = {};
    if (countyOrRegion.trim()) {
      extendedContext.countyOrRegion = countyOrRegion.trim();
    }
    if (middleNameOrInitial.trim()) {
      extendedContext.middleNameOrInitial = middleNameOrInitial.trim();
    }
    if (previousLocation.trim()) {
      extendedContext.previousLocation = previousLocation.trim();
    }
    if (professionalInfo.trim()) {
      extendedContext.professionalInfo = professionalInfo.trim();
    }
    if (knownAliases.trim()) {
      // Split by commas and clean up
      const aliases = knownAliases
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      if (aliases.length > 0) {
        extendedContext.knownAliases = aliases;
      }
    }

    if (Object.keys(extendedContext).length > 0) {
      deepSearchContext.extendedContext = extendedContext;
    }

    const newId = createPersonContext(
      name.trim(),
      relationshipContext!,
      undefined,
      Object.keys(deepSearchContext).length > 0 ? deepSearchContext : undefined
    );

    // Only link to chat loop if showLinkOption is false (auto-link) or user chose to link
    const shouldLink = !showLinkOption || linkToChat;
    if (shouldLink) {
      setActiveLoopPersonContext(newId);
    }

    // Save info for completed state display
    setSavedName(name.trim());
    setSavedRelationship(relationshipContext);
    setSavedLinkedToChat(shouldLink);
    setIsCompleted(true);

    onPersonContextCreated?.(newId, shouldLink);
  };

  // Completed state view
  if (isCompleted) {
    const relationshipLabel = RELATIONSHIP_OPTIONS.find(
      (r) => r.value === savedRelationship
    )?.label || savedRelationship;

    return (
      <View
        style={{
          backgroundColor: COLORS.background,
          borderRadius: 16,
          padding: 16,
          marginVertical: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.accentBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
                {savedName}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                {relationshipLabel} · Context saved{savedLinkedToChat ? " · Linked to chat" : ""}
              </Text>
            </View>
          </View>
          {onDismiss && (
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Form view
  return (
    <View
      style={{
        marginVertical: 8,
        paddingHorizontal: 4,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
              Soft Search
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
              internet and social media search
            </Text>
          </View>
        </View>
        {onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Profile Image Picker */}
      <View style={{ marginBottom: 20, alignItems: "center" }}>
        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3, alignSelf: "flex-start" }}>
          Profile photo
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10, alignSelf: "flex-start" }}>
          Add a photo to help with visual matching.
        </Text>
        <Pressable
          onPress={handlePickImage}
          style={({ pressed }) => ({
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: profileImageUri ? "transparent" : COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {profileImageUri ? (
            <Image
              source={{ uri: profileImageUri }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
            />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Ionicons name="camera-outline" size={24} color={COLORS.textMuted} />
              <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Add photo</Text>
            </View>
          )}
        </Pressable>
        {profileImageUri && (
          <Pressable
            onPress={handleRemoveImage}
            style={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 10 }}
          >
            <Text style={{ fontSize: 12, color: COLORS.error }}>Remove</Text>
          </Pressable>
        )}
      </View>

      {/* 1. Name (required) */}
      <ChatBubbleInput
        label="Name"
        helperText="Use the name they go by publicly."
        placeholder="Their name"
        value={name}
        onChangeText={setName}
        required
      />

      {/* Relationship (required) */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
          Relationship<Text style={{ color: COLORS.textMuted }}> *</Text>
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          How do you know them?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
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
                  backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                }}
              >
                <Text style={{ fontSize: 13, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Location (optional) */}
      <ChatBubbleInput
        label="Location"
        helperText="City or area they are usually in."
        placeholder="e.g. Los Angeles, NYC"
        value={location}
        onChangeText={setLocation}
      />

      {/* 3. Context anchor (optional - select ONE) */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
          One detail that might help
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          Just one thing that could help narrow results.
        </Text>
        <View style={{ gap: 6 }}>
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
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                }}
              >
                <Text style={{ fontSize: 13, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Show input for selected anchor */}
        {selectedAnchorType && (
          <View style={{ marginTop: 10 }}>
            <TextInput
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: COLORS.text,
              }}
              placeholder={CONTEXT_ANCHOR_OPTIONS.find(o => o.type === selectedAnchorType)?.placeholder}
              placeholderTextColor={COLORS.textMuted}
              value={anchorValue}
              onChangeText={setAnchorValue}
            />
          </View>
        )}
      </View>

      {/* 4. Optional boost (collapsed by default) */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setShowBoost(!showBoost);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          marginBottom: showBoost ? 10 : 0,
        }}
      >
        <Ionicons
          name={showBoost ? "chevron-down" : "chevron-forward"}
          size={16}
          color={COLORS.textMuted}
        />
        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 4 }}>
          Additional details (optional)
        </Text>
      </Pressable>

      {showBoost && (
        <View style={{ marginBottom: 16 }}>
          <ChatBubbleInput
            label="Approximate age"
            helperText="Used only to narrow public matches."
            placeholder="e.g. Late 20s, Mid 30s"
            value={approximateAge}
            onChangeText={setApproximateAge}
          />
        </View>
      )}

      {/* 5. Extended details for more thorough searches */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setShowExtendedDetails(!showExtendedDetails);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          marginBottom: showExtendedDetails ? 10 : 0,
        }}
      >
        <Ionicons
          name={showExtendedDetails ? "chevron-down" : "chevron-forward"}
          size={16}
          color={COLORS.textMuted}
        />
        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 4 }}>
          Add more details for thorough search
        </Text>
      </Pressable>

      {showExtendedDetails && (
        <View style={{ marginBottom: 16 }}>
          <ChatBubbleInput
            label="County or region"
            helperText="County or region helps with court and public record searches."
            placeholder="e.g. Los Angeles County, Harris County"
            value={countyOrRegion}
            onChangeText={setCountyOrRegion}
          />
          <ChatBubbleInput
            label="Middle name or initial"
            helperText="Helps distinguish people with similar names."
            placeholder="e.g. Michael, J."
            value={middleNameOrInitial}
            onChangeText={setMiddleNameOrInitial}
          />
          <ChatBubbleInput
            label="Previous city or state"
            helperText="If they recently moved or lived elsewhere."
            placeholder="e.g. Chicago, IL"
            value={previousLocation}
            onChangeText={setPreviousLocation}
          />
          <ChatBubbleInput
            label="Company, business, or role"
            helperText="Used for professional or business searches."
            placeholder="e.g. Google, Real estate agent"
            value={professionalInfo}
            onChangeText={setProfessionalInfo}
          />
          <ChatBubbleInput
            label="Known aliases or past usernames"
            helperText="Any usernames they have used before, even if old. Separate with commas."
            placeholder="e.g. cooluser123, old_handle"
            value={knownAliases}
            onChangeText={setKnownAliases}
          />
        </View>
      )}

      {/* Link to chat toggle - only show if showLinkOption is true */}
      {showLinkOption && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setLinkToChat(!linkToChat);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            paddingHorizontal: 14,
            backgroundColor: COLORS.surface,
            borderRadius: 10,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 2 }}>
              Link to chat
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
              Use this context to inform AI responses in chat
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: linkToChat ? COLORS.accent : COLORS.surfaceHover,
              justifyContent: "center",
              paddingHorizontal: 2,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#fff",
                alignSelf: linkToChat ? "flex-end" : "flex-start",
              }}
            />
          </View>
        </Pressable>
      )}

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={!isFormValid}
        style={({ pressed }) => ({
          backgroundColor: isFormValid ? COLORS.accent : COLORS.surface,
          paddingVertical: 14,
          borderRadius: 10,
          marginTop: 8,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{
          fontSize: 15,
          fontWeight: "600",
          color: isFormValid ? "#fff" : COLORS.textMuted,
          textAlign: "center"
        }}>
          Save
        </Text>
      </Pressable>
    </View>
  );
});
