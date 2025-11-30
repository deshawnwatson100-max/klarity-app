import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCalendarStore } from "../state/calendarStore";
import { INTENTIONS } from "../types/calendar";
import { RootStackParamList } from "../navigation/RootNavigator";
import * as Clipboard from "expo-clipboard";

type Props = NativeStackScreenProps<RootStackParamList, "LogDetailScreen">;

export function LogDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { date, entryIds } = route.params;

  const entries = useCalendarStore((s) =>
    s.getAllEntries().filter((e) => entryIds.includes(e.id))
  );

  if (entries.length === 0) {
    return (
      <View
        className="flex-1 bg-[#0A0A0A] items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-neutral-500">No entries found</Text>
      </View>
    );
  }

  const entry = entries[0]; // Show first entry for now
  const intention = INTENTIONS[entry.intention];
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleCopyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-neutral-900">
        <Pressable
          onPress={() => navigation.goBack()}
          className="mr-4 active:opacity-60"
        >
          <Ionicons name="arrow-back" size={24} color="#B4FF39" />
        </Pressable>
        <Text className="text-white text-lg font-semibold flex-1">
          Log Details
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Date Header */}
        <View className="mb-6">
          <Text className="text-white text-3xl font-bold mb-3">
            {formattedDate}
          </Text>
          <View
            style={{
              backgroundColor: intention.color + "20",
              borderColor: intention.color,
            }}
            className="self-start px-4 py-2 rounded-full border"
          >
            <Text
              style={{ color: intention.color }}
              className="text-sm font-bold uppercase tracking-wide"
            >
              {intention.label}
            </Text>
          </View>
        </View>

        {/* Your Situation Card */}
        <View className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4">
          <Text className="text-[#B4FF39] text-sm font-bold uppercase tracking-wide mb-3">
            Your Situation on This Day
          </Text>

          {/* Quick Summary */}
          <View className="mb-4 p-3 bg-neutral-900 rounded-xl border-l-4 border-red-500">
            <Text className="text-red-400 text-xs font-bold mb-1">
              ⚠️ Main Issue
            </Text>
            <Text className="text-white text-base font-semibold">
              {entry.quickSummary}
            </Text>
          </View>

          {/* Original Text */}
          <Text className="text-neutral-400 text-sm mb-2">Original Issue:</Text>
          <Text className="text-neutral-200 text-base leading-6">
            {entry.situationText}
          </Text>
        </View>

        {/* Klarity Analysis */}
        <View className="bg-neutral-950 border border-[#B4FF39] rounded-2xl p-5 mb-4">
          <Text className="text-[#B4FF39] text-lg font-bold mb-4">
            Klarity Analysis
          </Text>

          {/* Quick Summary Block */}
          <View className="gap-3 mb-4">
            <View className="flex-row">
              <Text className="text-blue-400 text-sm font-bold w-32">
                Tone:
              </Text>
              <Text className="text-white text-sm flex-1">
                {entry.analysis.tone}
              </Text>
            </View>

            <View className="flex-row">
              <Text className="text-purple-400 text-sm font-bold w-32">
                Pattern:
              </Text>
              <Text className="text-white text-sm flex-1">
                {entry.analysis.pattern}
              </Text>
            </View>

            <View className="flex-row">
              <Text className="text-orange-400 text-sm font-bold w-32">
                Impact:
              </Text>
              <Text className="text-white text-sm flex-1">
                {entry.analysis.emotionalImpact}
              </Text>
            </View>

            <View className="flex-row">
              <Text className="text-yellow-400 text-sm font-bold w-32">
                Core Issue:
              </Text>
              <Text className="text-white text-sm flex-1">
                {entry.analysis.coreIssue}
              </Text>
            </View>
          </View>

          {/* Full Analysis */}
          <View className="pt-4 border-t border-neutral-800">
            <Text className="text-neutral-400 text-sm mb-2">
              Full Analysis:
            </Text>
            <Text className="text-neutral-200 text-base leading-6">
              {entry.analysis.fullAnalysis}
            </Text>
          </View>
        </View>

        {/* Guidance Provided */}
        <View className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4">
          <Text className="text-[#B4FF39] text-sm font-bold uppercase tracking-wide mb-4">
            Guidance Provided
          </Text>

          {/* Suggested Replies */}
          {entry.suggestedReplies.length > 0 && (
            <View className="mb-4">
              <Text className="text-neutral-400 text-sm mb-2">
                Suggested Replies:
              </Text>
              {entry.suggestedReplies.map((reply, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleCopyText(reply)}
                  className="bg-neutral-900 p-3 rounded-xl mb-2 active:opacity-80"
                >
                  <Text className="text-white text-sm leading-5">{reply}</Text>
                  <Text className="text-neutral-500 text-xs mt-2">
                    Tap to copy
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Emotional Advice */}
          <View className="mb-3">
            <Text className="text-neutral-400 text-sm mb-2">
              Emotional Advice:
            </Text>
            <Text className="text-neutral-200 text-sm leading-5">
              {entry.emotionalAdvice}
            </Text>
          </View>

          {/* Boundary Wording */}
          {entry.boundaryWording && (
            <View className="mb-3">
              <Text className="text-neutral-400 text-sm mb-2">
                Boundary Wording:
              </Text>
              <Text className="text-neutral-200 text-sm leading-5">
                {entry.boundaryWording}
              </Text>
            </View>
          )}

          {/* Safety Notes */}
          {entry.safetyNotes && (
            <View className="p-3 bg-red-950 border border-red-800 rounded-xl">
              <Text className="text-red-400 text-xs font-bold mb-1">
                ⚠️ Safety Notes
              </Text>
              <Text className="text-red-200 text-sm leading-5">
                {entry.safetyNotes}
              </Text>
            </View>
          )}
        </View>

        {/* User Response */}
        {entry.userResponse && (
          <View className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4">
            <Text className="text-[#B4FF39] text-sm font-bold uppercase tracking-wide mb-3">
              Your Response
            </Text>
            <Text className="text-white text-base leading-6 mb-2">
              {entry.userResponse}
            </Text>
            {entry.userResponseTimestamp && (
              <Text className="text-neutral-500 text-xs">
                Sent{" "}
                {new Date(entry.userResponseTimestamp).toLocaleTimeString()}
              </Text>
            )}
          </View>
        )}

        {/* Reflection Notes */}
        {entry.reflectionNotes && (
          <View className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4">
            <Text className="text-[#B4FF39] text-sm font-bold uppercase tracking-wide mb-3">
              Your Reflection
            </Text>
            <Text className="text-neutral-200 text-base leading-6 italic">
              &ldquo;{entry.reflectionNotes}&rdquo;
            </Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
