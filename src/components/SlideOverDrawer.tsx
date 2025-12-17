import React, { useEffect } from "react";
import { View, Text, Pressable, Dimensions, BackHandler } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useLoopsStore } from "../state/loopsStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

interface SlideOverDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

function MenuItem({ icon, label, onPress, isLast = false }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "transparent",
      })}
    >
      <View
        className="flex-row items-center px-5 py-4"
        style={{
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: "rgba(255, 255, 255, 0.08)",
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={18} color="#9CA3AF" />
        </View>
        <Text
          className="text-base font-medium ml-3"
          style={{ color: "#E5E7EB" }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function SlideOverDrawer({ visible, onClose }: SlideOverDrawerProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  // Animation values
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  // Animation config
  const ANIMATION_DURATION = 280;
  const EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
      backdropOpacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
      backdropOpacity.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
    }
  }, [visible]);

  // Handle back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (visible) {
          onClose();
          return true;
        }
        return false;
      }
    );
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Close drawer helper
  const closeDrawer = () => {
    onClose();
  };

  // Swipe gesture to close
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(-20)
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -DRAWER_WIDTH);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -80 || event.velocityX < -500) {
        translateX.value = withTiming(-DRAWER_WIDTH, {
          duration: 200,
          easing: EASING,
        });
        backdropOpacity.value = withTiming(0, {
          duration: 200,
          easing: EASING,
        });
        runOnJS(closeDrawer)();
      } else {
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
      }
    });

  // Animated styles
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? "auto" : "none",
  }));

  // Menu handlers
  const handleNewChat = () => {
    closeDrawer();
    setTimeout(() => {
      createNewLoop();
      navigation.navigate("InputScreen" as never);
    }, 100);
  };

  const handleSearchChats = () => {
    closeDrawer();
    setTimeout(() => {
      setHistoryPanelOpen(true);
    }, 100);
  };

  const handleCalendar = () => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate("CalendarScreen" as never);
    }, 100);
  };

  const handleYourChats = () => {
    closeDrawer();
    setTimeout(() => {
      setHistoryPanelOpen(true);
    }, 100);
  };

  if (!visible && translateX.value === -DRAWER_WIDTH) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          },
          backdropStyle,
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={closeDrawer}
        />
      </Animated.View>

      {/* Drawer */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              backgroundColor: "#0A0A0C",
              borderRightWidth: 0.5,
              borderRightColor: "rgba(255, 255, 255, 0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 4, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 10,
            },
            drawerStyle,
          ]}
        >
          {/* Header */}
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingBottom: 20,
              paddingHorizontal: 20,
              borderBottomWidth: 0.5,
              borderBottomColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <Text
              className="text-xl font-semibold"
              style={{ color: "#F9FAFB" }}
            >
              Klarity
            </Text>
            <Text
              className="text-sm mt-1"
              style={{ color: "#6B7280" }}
            >
              Find your clarity
            </Text>
          </View>

          {/* Menu Items */}
          <View style={{ marginTop: 8 }}>
            <MenuItem
              icon="add-outline"
              label="New Chat"
              onPress={handleNewChat}
            />
            <MenuItem
              icon="search-outline"
              label="Search Chats"
              onPress={handleSearchChats}
            />
            <MenuItem
              icon="calendar-outline"
              label="Calendar"
              onPress={handleCalendar}
            />
            <MenuItem
              icon="chatbubbles-outline"
              label="Your Chats"
              onPress={handleYourChats}
              isLast
            />
          </View>

          {/* Footer */}
          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 20,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: "rgba(255, 255, 255, 0.06)",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(167, 139, 250, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person-outline" size={18} color="#A78BFA" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  className="text-sm font-medium"
                  style={{ color: "#E5E7EB" }}
                >
                  Personal
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: "#6B7280" }}
                >
                  Free Plan
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
