import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCalendarStore } from "../state/calendarStore";
import { INTENTIONS } from "../types/calendar";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CalendarScreen">;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getEntriesForDate = useCalendarStore((s) => s.getEntriesForDate);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDatePress = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const entries = getEntriesForDate(dateStr);

    if (entries.length > 0) {
      navigation.navigate("LogDetailScreen", {
        date: dateStr,
        entryIds: entries.map((e) => e.id),
      });
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const screenWidth = Dimensions.get("window").width;
    const dayWidth = (screenWidth - 32) / 7; // padding consideration

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <View
          key={`empty-${i}`}
          style={{ width: dayWidth, height: dayWidth }}
          className="p-1"
        />
      );
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const entries = getEntriesForDate(dateStr);
      const hasEntries = entries.length > 0;

      // Get intention colors for this date
      const intentionColors = entries.map(
        (entry) => INTENTIONS[entry.intention].color
      );

      const isToday =
        day === new Date().getDate() &&
        currentMonth === new Date().getMonth() &&
        currentYear === new Date().getFullYear();

      days.push(
        <Pressable
          key={day}
          onPress={() => handleDatePress(day)}
          style={{ width: dayWidth, height: dayWidth }}
          className="p-1"
        >
          <View
            className={`flex-1 items-center justify-center rounded-xl ${
              isToday ? "bg-neutral-900 border border-[#B4FF39]" : ""
            }`}
          >
            <Text
              className={`text-base font-medium ${
                hasEntries ? "text-white" : "text-neutral-500"
              }`}
            >
              {day}
            </Text>

            {/* Intention indicators */}
            {hasEntries && (
              <View className="flex-row gap-1 mt-1">
                {intentionColors.slice(0, 3).map((color, index) => (
                  <View
                    key={index}
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: color,
                      shadowColor: color,
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                      elevation: 5,
                    }}
                    className="rounded-full"
                  />
                ))}
                {intentionColors.length > 3 && (
                  <Text className="text-[10px] text-neutral-400">
                    +{intentionColors.length - 3}
                  </Text>
                )}
              </View>
            )}
          </View>
        </Pressable>
      );
    }

    return days;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-6 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-white text-2xl font-bold mb-1">
            Your Emotional Timeline
          </Text>
          <Text className="text-neutral-400 text-sm">
            Track your clarity journey
          </Text>
        </View>

        {/* Home Button */}
        <Pressable
          onPress={() => navigation.navigate("InputScreen")}
          className="active:opacity-60 mt-1"
        >
          <Ionicons name="home" size={28} color="#B4FF39" />
        </Pressable>
      </View>

      {/* Month Navigation */}
      <View className="flex-row items-center justify-between px-4 mb-6">
        <Pressable
          onPress={handlePreviousMonth}
          className="p-2 active:opacity-60"
        >
          <Ionicons name="chevron-back" size={24} color="#B4FF39" />
        </Pressable>

        <Text className="text-white text-xl font-semibold">
          {MONTHS[currentMonth]} {currentYear}
        </Text>

        <Pressable
          onPress={handleNextMonth}
          className="p-2 active:opacity-60"
        >
          <Ionicons name="chevron-forward" size={24} color="#B4FF39" />
        </Pressable>
      </View>

      {/* Legend */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-4"
        contentContainerClassName="gap-3"
      >
        {Object.entries(INTENTIONS).map(([key, config]) => (
          <View
            key={key}
            className="flex-row items-center bg-neutral-900 rounded-full px-3 py-2"
          >
            <View
              style={{
                width: 8,
                height: 8,
                backgroundColor: config.color,
                shadowColor: config.color,
                shadowOpacity: 0.6,
                shadowRadius: 3,
                elevation: 3,
              }}
              className="rounded-full mr-2"
            />
            <Text className="text-white text-xs font-medium">
              {config.label}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Calendar Grid */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Day headers */}
        <View className="flex-row mb-2">
          {DAYS.map((day) => (
            <View
              key={day}
              style={{ width: (Dimensions.get("window").width - 32) / 7 }}
              className="items-center"
            >
              <Text className="text-neutral-500 text-xs font-semibold">
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar days */}
        <View className="flex-row flex-wrap mb-8">{renderCalendarDays()}</View>

        {/* Empty state hint */}
        <View className="items-center py-8">
          <Ionicons name="calendar-outline" size={48} color="#333" />
          <Text className="text-neutral-500 text-sm mt-3 text-center px-8">
            Dates with colored dots contain emotional log entries.{"\n"}Tap to
            view details.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
