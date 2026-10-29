import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: { email?: string };
  SignupOtp: { email: string; firstName: string; lastName: string; phone?: string };
  ForgotPassword: undefined;
  ForgotPasswordOtp: { email: string };
};

// Parent Tabs & Stacks
export type ParentTabParamList = {
  ParentHome: undefined;
  Book: undefined;
  Bookings: undefined;
  Messages: NavigatorScreenParams<ParentMessagesStackParamList>;
  ParentMore: NavigatorScreenParams<ParentMoreStackParamList>;
};

export type ParentMessagesStackParamList = {
  ConversationList: undefined;
  ChatDetail: { conversationId: string; otherPartyName: string };
};

export type ParentMoreStackParamList = {
  MoreHub: undefined;
  MyChildren: undefined;
  ChildProfile: { childId: string };
  MyAssessments: undefined;
  BookAssessment: undefined;
  Payments: undefined;
  Reports: undefined;
  Enrolment: undefined;
  LearningShop: undefined;
  MyOrders: undefined;
  Notifications: undefined;
  Account: undefined;
};

// Teacher Tabs & Stacks
export type TeacherTabParamList = {
  TeacherHome: undefined;
  Attendance: undefined;
  Students: undefined;
  Messages: undefined;
  More: NavigatorScreenParams<TeacherMoreStackParamList>;
};

export type TeacherMoreStackParamList = {
  TeacherMoreHub: undefined;
  MyClasses: undefined;
  Assessments: undefined;
  Reports: undefined;
  Notifications: undefined;
  Account: undefined;
};

// Admin Tabs & Stacks
export type AdminTabParamList = {
  AdminHome: undefined;
  AdminBookings: undefined;
  AdminPayments: undefined;
  AdminMessages: NavigatorScreenParams<AdminMessagesStackParamList>;
  AdminMore: NavigatorScreenParams<AdminMoreStackParamList>;
};

export type AdminMessagesStackParamList = {
  MessageList: undefined;
  ChatDetail: { conversationId: string; otherPartyName: string };
};

export type AdminMoreStackParamList = {
  MoreHub: undefined;
  FamilyBooking: undefined;
  MyTeaching: undefined;
  Tutors: undefined;
  Parents: undefined;
  Timetable: undefined;
  Assessments: undefined;
  Programs: undefined;
  ShopOrders: undefined;
  ShopProducts: undefined;
  Settings: undefined;
  Notifications: undefined;
  Account: undefined;
};

// Root
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  ParentTabs: NavigatorScreenParams<ParentTabParamList>;
  TeacherTabs: NavigatorScreenParams<TeacherTabParamList>;
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
};

// Navigation props helpers
export type AuthStackProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type ParentTabProps<T extends keyof ParentTabParamList> = BottomTabScreenProps<
  ParentTabParamList,
  T
>;

export type ParentMoreStackProps<T extends keyof ParentMoreStackParamList> = NativeStackScreenProps<
  ParentMoreStackParamList,
  T
>;

export type ParentMessagesStackProps<T extends keyof ParentMessagesStackParamList> = NativeStackScreenProps<
  ParentMessagesStackParamList,
  T
>;

export type TeacherTabProps<T extends keyof TeacherTabParamList> = BottomTabScreenProps<
  TeacherTabParamList,
  T
>;

export type TeacherMoreStackProps<T extends keyof TeacherMoreStackParamList> = NativeStackScreenProps<
  TeacherMoreStackParamList,
  T
>;

export type AdminTabProps<T extends keyof AdminTabParamList> = BottomTabScreenProps<
  AdminTabParamList,
  T
>;

export type AdminMessagesStackProps<T extends keyof AdminMessagesStackParamList> = NativeStackScreenProps<
  AdminMessagesStackParamList,
  T
>;

export type AdminMoreStackProps<T extends keyof AdminMoreStackParamList> = NativeStackScreenProps<
  AdminMoreStackParamList,
  T
>;

// Composite props (for screens that can be navigated to from multiple stacks)
export type RootStackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
