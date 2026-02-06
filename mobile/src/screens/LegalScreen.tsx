import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = StackScreenProps<RootStackParamList, "LegalScreen">;

type LegalTab = "terms" | "privacy";

export function LegalScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const initialTab = route.params?.tab || "terms";
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleTabChange = (tab: LegalTab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#0A0A0B" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.06)",
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            className="active:opacity-60"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color="#9CA3AF" />
          </Pressable>
          <Text className="text-lg font-semibold" style={{ color: "#F9FAFB" }}>
            Legal
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Tab Switcher */}
        <View
          className="flex-row mt-4"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: 10,
            padding: 4,
          }}
        >
          <Pressable
            onPress={() => handleTabChange("terms")}
            className="flex-1"
            style={{
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: activeTab === "terms" ? "rgba(255, 255, 255, 0.1)" : "transparent",
            }}
          >
            <Text
              className="text-center text-sm font-medium"
              style={{ color: activeTab === "terms" ? "#F9FAFB" : "#6B7280" }}
            >
              Terms of Service
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabChange("privacy")}
            className="flex-1"
            style={{
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: activeTab === "privacy" ? "rgba(255, 255, 255, 0.1)" : "transparent",
            }}
          >
            <Text
              className="text-center text-sm font-medium"
              style={{ color: activeTab === "privacy" ? "#F9FAFB" : "#6B7280" }}
            >
              Privacy Policy
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "terms" ? <TermsContent /> : <PrivacyContent />}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-base font-semibold mt-6 mb-3" style={{ color: "#F9FAFB" }}>
      {children}
    </Text>
  );
}

function Paragraph({ children }: { children: string }) {
  return (
    <Text className="text-sm leading-6 mb-4" style={{ color: "#9CA3AF" }}>
      {children}
    </Text>
  );
}

function TermsContent() {
  return (
    <View>
      <Text className="text-xs mb-4" style={{ color: "#6B7280" }}>
        Last updated: January 2025
      </Text>

      <Paragraph>
        Welcome to Klarity. By using our app, you agree to these Terms of Service. Please read them carefully before using our services.
      </Paragraph>

      <SectionTitle>1. Acceptance of Terms</SectionTitle>
      <Paragraph>
        By accessing or using Klarity, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our app.
      </Paragraph>

      <SectionTitle>2. Description of Service</SectionTitle>
      <Paragraph>
        Klarity is an AI-powered communication assistant designed to help users understand and navigate interpersonal communications. The app provides analysis, suggestions, and insights based on the content you share with it.
      </Paragraph>

      <SectionTitle>3. User Responsibilities</SectionTitle>
      <Paragraph>
        You are responsible for all content you submit to Klarity. You agree not to use the service for any unlawful purpose or in any way that could damage, disable, or impair the service. You must be at least 13 years old to use this app.
      </Paragraph>

      <SectionTitle>4. Privacy and Data</SectionTitle>
      <Paragraph>
        Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information. By using Klarity, you consent to our data practices as described in the Privacy Policy.
      </Paragraph>

      <SectionTitle>5. AI-Generated Content</SectionTitle>
      <Paragraph>
        Klarity uses artificial intelligence to provide analysis and suggestions. This content is provided for informational purposes only and should not be considered professional advice. We do not guarantee the accuracy, completeness, or usefulness of any AI-generated content.
      </Paragraph>

      <SectionTitle>6. Intellectual Property</SectionTitle>
      <Paragraph>
        All content, features, and functionality of Klarity are owned by us and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of the app without our written permission.
      </Paragraph>

      <SectionTitle>7. Subscriptions and Payments</SectionTitle>
      <Paragraph>
        Some features of Klarity may require a paid subscription. Payment will be charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
      </Paragraph>

      <SectionTitle>8. Limitation of Liability</SectionTitle>
      <Paragraph>
        Klarity is provided as-is without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
      </Paragraph>

      <SectionTitle>9. Changes to Terms</SectionTitle>
      <Paragraph>
        We reserve the right to modify these terms at any time. We will notify users of significant changes through the app. Your continued use of Klarity after changes constitutes acceptance of the new terms.
      </Paragraph>

      <SectionTitle>10. Contact Us</SectionTitle>
      <Paragraph>
        If you have any questions about these Terms of Service, please contact us through the app or via our support channels.
      </Paragraph>
    </View>
  );
}

function PrivacyContent() {
  return (
    <View>
      <Text className="text-xs mb-4" style={{ color: "#6B7280" }}>
        Last updated: January 2025
      </Text>

      <Paragraph>
        This Privacy Policy explains how Klarity collects, uses, and protects your personal information when you use our app.
      </Paragraph>

      <SectionTitle>1. Information We Collect</SectionTitle>
      <Paragraph>
        We collect information you provide directly, including text messages and images you submit for analysis. We also collect usage data such as app interactions and device information to improve our service.
      </Paragraph>

      <SectionTitle>2. How We Use Your Information</SectionTitle>
      <Paragraph>
        We use your information to provide and improve our AI-powered communication analysis service, personalize your experience, and communicate with you about updates and features.
      </Paragraph>

      <SectionTitle>3. Data Storage and Security</SectionTitle>
      <Paragraph>
        Your data is stored securely on your device and our servers. We implement industry-standard security measures to protect your information from unauthorized access, alteration, or destruction.
      </Paragraph>

      <SectionTitle>4. AI Processing</SectionTitle>
      <Paragraph>
        Content you submit is processed by AI systems to provide analysis and suggestions. This processing may involve third-party AI services. We do not use your personal conversations to train AI models without your explicit consent.
      </Paragraph>

      <SectionTitle>5. Data Retention</SectionTitle>
      <Paragraph>
        We retain your data for as long as your account is active or as needed to provide services. You can delete your conversation history at any time within the app.
      </Paragraph>

      <SectionTitle>6. Third-Party Services</SectionTitle>
      <Paragraph>
        We may use third-party services for analytics, payments, and AI processing. These services have their own privacy policies governing the use of your information.
      </Paragraph>

      <SectionTitle>7. Your Rights</SectionTitle>
      <Paragraph>
        You have the right to access, correct, or delete your personal information. You can manage your data through the app settings or by contacting our support team.
      </Paragraph>

      <SectionTitle>8. Children&apos;s Privacy</SectionTitle>
      <Paragraph>
        Klarity is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
      </Paragraph>

      <SectionTitle>9. Changes to This Policy</SectionTitle>
      <Paragraph>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy in the app and updating the Last Updated date.
      </Paragraph>

      <SectionTitle>10. Contact Us</SectionTitle>
      <Paragraph>
        If you have questions about this Privacy Policy or our data practices, please contact us through the app or via our support channels.
      </Paragraph>
    </View>
  );
}
