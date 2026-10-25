import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['fairybread://', 'https://fairybread.app', 'https://*.fairybread.app'],
  config: {
    screens: {
      // Auth stack (public)
      Auth: {
        screens: {
          Welcome: 'welcome',
          Login: 'login',
          Signup: 'signup',
          SignupOtp: 'signup/otp',
          ForgotPassword: 'forgot-password',
          ForgotPasswordOtp: 'forgot-password/otp',
        },
      },
      // Parent tabs
      ParentTabs: {
        screens: {
          ParentHome: 'parent',
          Book: 'parent/book',
          Bookings: 'parent/bookings',
          Messages: 'parent/messages',
          ParentMore: {
            screens: {
              MoreHub: 'parent/more',
              MyChildren: 'parent/children',
              MyAssessments: 'parent/assessments',
              BookAssessment: 'parent/book-assessment',
              Payments: 'parent/payments',
              Reports: 'parent/reports',
              Enrolment: 'parent/enrolment',
              LearningShop: 'parent/shop',
              MyOrders: 'parent/orders',
              Notifications: 'parent/notifications',
              Account: 'parent/account',
            },
          },
        },
      },
      // Teacher tabs
      TeacherTabs: {
        screens: {
          TeacherHome: 'teacher',
          Attendance: 'teacher/attendance',
          Students: 'teacher/students',
          Messages: 'teacher/messages',
          TeacherMore: {
            screens: {
              TeacherMoreHub: 'teacher/more',
              MyClasses: 'teacher/classes',
              Assessments: 'teacher/assessments',
              Reports: 'teacher/reports',
              Notifications: 'teacher/notifications',
              Account: 'teacher/account',
            },
          },
        },
      },
      // Admin tabs
      AdminTabs: {
        screens: {
          AdminHome: 'admin',
          AdminBookings: 'admin/bookings',
          AdminPayments: 'admin/payments',
          AdminMessages: 'admin/messages',
          AdminMore: {
            screens: {
              MoreHub: 'admin/more',
              FamilyBooking: 'admin/family-booking',
              MyTeaching: 'admin/teaching',
              Tutors: 'admin/tutors',
              Parents: 'admin/parents',
              Timetable: 'admin/timetable',
              Assessments: 'admin/assessments',
              Programs: 'admin/programs',
              ShopOrders: 'admin/shop/orders',
              ShopProducts: 'admin/shop/products',
              Settings: 'admin/settings',
              Notifications: 'admin/notifications',
              Account: 'admin/account',
            },
          },
        },
      },
    },
  },
};
