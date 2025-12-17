import React, { useState } from "react";
import { View, Text, Pressable, TextInput, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOutUp,
} from "react-native-reanimated";
import { useLoopsStore } from "../state/loopsStore";

interface RelationshipPromptCardProps {
  loopId: string;
  onDismiss: () => void;
  onTrackingEnabled: (relationshipId: string) => void;
}

export function RelationshipPromptCard({
  loopId,
  onDismiss,
  onTrackingEnabled,
}: RelationshipPromptCardProps) {
  const [showInput, setShowInput] = useState(false);
  const [personName, setPersonName] = useState("");

  const createRelationship = useLoopsStore((s) => s.createRelationship);
  const linkLoopToRelationship = useLoopsStore((s) => s.linkLoopToRelationship);
  const trackedRelationships = useLoopsStore((s) => s.trackedRelationships);

  const handleTrackRelationship = () => {
    setShowInput(true);
  };

  const handleConfirmTracking = () => {
    if (!personName.trim()) return;

    Keyboard.dismiss();

    // Check if relationship with this name already exists
    const existingRelationship = trackedRelationships.find(
      (rel) => rel.name.toLowerCase() === personName.trim().toLowerCase()
    );

    let relationshipId: string;

    if (existingRelationship) {
      // Link to existing relationship
      relationshipId = existingRelationship.id;
    } else {
      // Create new relationship
      relationshipId = createRelationship(personName.trim());
    }

    // Link the current loop to the relationship
    linkLoopToRelationship(loopId, relationshipId);

    onTrackingEnabled(relationshipId);
  };

  const handleNotNow = () => {
    onDismiss();
  };

  if (showInput) {
    return (
      <Animated.View
        entering={FadeInDown.duration(200)}
        exiting={FadeOutUp.duration(200)}
        className="mx-4 mb-4"
      >
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text
            className="text-sm mb-3"
            style={{ color: "#9CA3AF" }}
          >
            Name or label (e.g., Mom, Manager, Alex)
          </Text>

          <TextInput
            className="text-base px-4 py-3 rounded-xl mb-3"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              color: "#E5E7EB",
            }}
            placeholder="Enter a name..."
            placeholderTextColor="#6B7280"
            value={personName}
            onChangeText={setPersonName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirmTracking}
          />

          <View className="flex-row justify-end">
            <Pressable
              onPress={handleNotNow}
              className="px-4 py-2 mr-2 active:opacity-60"
            >
              <Text style={{ color: "#6B7280" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmTracking}
              className="px-4 py-2 rounded-lg active:opacity-60"
              style={{
                backgroundColor: personName.trim()
                  ? "rgba(167, 139, 250, 0.2)"
                  : "rgba(255, 255, 255, 0.06)",
              }}
              disabled={!personName.trim()}
            >
              <Text
                style={{
                  color: personName.trim() ? "#A78BFA" : "#6B7280",
                }}
              >
                Confirm
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(200)}
      exiting={FadeOutUp.duration(200)}
      className="mx-4 mb-4"
    >
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View className="flex-row items-center mb-3">
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(167, 139, 250, 0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="heart-outline" size={16} color="#A78BFA" />
          </View>
          <Text
            className="text-base font-medium ml-3"
            style={{ color: "#E5E7EB" }}
          >
            Track patterns?
          </Text>
        </View>

        <Text
          className="text-sm mb-4"
          style={{ color: "#9CA3AF", lineHeight: 20 }}
        >
          Would you like to track patterns with this person to gain long-term clarity?
        </Text>

        <View className="flex-row">
          <Pressable
            onPress={handleTrackRelationship}
            className="flex-1 py-3 rounded-xl mr-2 active:opacity-60"
            style={{
              backgroundColor: "rgba(167, 139, 250, 0.15)",
            }}
          >
            <Text
              className="text-center font-medium"
              style={{ color: "#A78BFA" }}
            >
              Track this relationship
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNotNow}
            className="py-3 px-4 rounded-xl active:opacity-60"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <Text style={{ color: "#6B7280" }}>Not right now</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
