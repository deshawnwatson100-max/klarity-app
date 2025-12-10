import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface ContextOrDirectionChoiceProps {
  onSelectAddContext: () => void;
  onSelectDirection: () => void;
  onSelectInstantReply: () => void;
}

export function ContextOrDirectionChoice({
  onSelectAddContext,
  onSelectDirection,
  onSelectInstantReply,
}: ContextOrDirectionChoiceProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500).springify()}
      style={{
        marginVertical: 16,
        marginHorizontal: 16,
      }}
    >
      {/* Container */}
      <View
        style={{
          backgroundColor: "#0A0A0A",
          borderRadius: 16,
          padding: 20,
          borderWidth: 0.5,
          borderColor: "#262626",
        }}
      >
        {/* Header */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#F9FAFB",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          What would you like to do next?
        </Text>

        {/* Option 1: Add More Context */}
        <Pressable
          onPress={onSelectAddContext}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#1A1A1A" : "#141414",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#B8A3E820",
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Icon */}
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#B8A3E8" />
            </View>

            {/* Text Content */}
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#F9FAFB",
                  marginBottom: 6,
                  letterSpacing: 0.2,
                }}
              >
                Add More Context
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                  lineHeight: 20,
                  letterSpacing: 0.1,
                }}
              >
                Share additional details for better guidance
              </Text>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
        </Pressable>

        {/* Option 2: Get Instant Reply Suggestion */}
        <Pressable
          onPress={onSelectInstantReply}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#1A1A1A" : "#141414",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#4FFFD720",
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Icon */}
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Ionicons name="chatbox-ellipses-outline" size={24} color="#4FFFD7" />
            </View>

            {/* Text Content */}
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#F9FAFB",
                  marginBottom: 6,
                  letterSpacing: 0.2,
                }}
              >
                Get Instant Reply Suggestion
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                  lineHeight: 20,
                  letterSpacing: 0.1,
                }}
              >
                Receive a quick response suggestion
              </Text>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
        </Pressable>

        {/* Option 3: Choose Relationship Direction */}
        <Pressable
          onPress={() => {
            console.log("Choose Relationship Direction pressed");
            onSelectDirection();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#1A1A1A" : "#141414",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#4C9EFF20",
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Icon */}
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Ionicons name="compass-outline" size={24} color="#4C9EFF" />
            </View>

            {/* Text Content */}
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#F9FAFB",
                  marginBottom: 6,
                  letterSpacing: 0.2,
                }}
              >
                Choose Relationship Direction
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                  lineHeight: 20,
                  letterSpacing: 0.1,
                }}
              >
                Continue with current understanding
              </Text>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}
