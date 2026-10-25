import type { AppSupabase } from '../../supabase';
import type { DataClient } from '../types';
import * as auth from './auth';
import * as families from './families';
import * as terms from './terms';
import * as bookings from './bookings';
import * as catalog from './catalog';
import * as payments from './payments';
import * as assessments from './assessments';
import * as messaging from './messaging';
import * as notifications from './notifications';
import * as admin from './admin';
import * as shop from './shop';
import * as settings from './settings';

export function createSupabaseDataClient(sb: AppSupabase): DataClient {
  return {
    // ── Auth ───────────────────────────────────────────────
    signIn: (email, password) => auth.signIn(sb, email, password),
    requestSignupOtp: (input) => auth.requestSignupOtp(sb, input),
    requestPasswordResetOtp: (email) => auth.requestPasswordResetOtp(sb, email),
    verifyOtp: (email, code, purpose) => auth.verifyOtp(sb, email, code, purpose),
    setPassword: (password) => auth.setPassword(sb, password),
    signOut: () => auth.signOut(sb),
    getMyContext: () => auth.getMyContext(sb),
    onAuthChange: (cb) => auth.onAuthChange(sb, cb),

    // ── Families & children ───────────────────────────────
    getFamily: (id) => families.getFamily(sb, id),
    getAllFamilies: () => families.getAllFamilies(sb),
    createFamily: (input) => families.createFamily(sb, input),
    updateFamily: (id, patch) => families.updateFamily(sb, id, patch),
    getChildren: (id) => families.getChildren(sb, id),
    getAllChildren: () => families.getAllChildren(sb),
    addChild: (familyId, child) => families.addChild(sb, familyId, child),
    updateChild: (id, patch) => families.updateChild(sb, id, patch),
    completeEnrolment: (id, input) => families.completeEnrolment(sb, id, input),
    adminMarkEnrolled: (id, note) => families.adminMarkEnrolled(sb, id, note),

    // ── Terms & gating ────────────────────────────────────
    getTerms: (familyId) => terms.getTerms(sb, familyId),
    getAllTerms: () => terms.getAllTerms(sb),
    getGating: (familyId) => terms.getGating(sb, familyId),
    adminAdjustCredits: (termId, delta, note) => terms.adminAdjustCredits(sb, termId, delta, note),

    // ── Catalog & sessions ────────────────────────────────
    getPrograms: () => catalog.getPrograms(sb),
    upsertProgram: (p) => catalog.upsertProgram(sb, p),
    getTeachers: () => catalog.getTeachers(sb),
    getClassSlots: () => catalog.getClassSlots(sb),
    createClassSlot: (input) => catalog.createClassSlot(sb, input),
    updateClassSlot: (id, patch) => catalog.updateClassSlot(sb, id, patch),
    deactivateClassSlot: (id, cancelFuture) => catalog.deactivateClassSlot(sb, id, cancelFuture),
    getUpcomingSessions: (opts) => catalog.getUpcomingSessions(sb, opts),
    cancelSession: (id, reason) => catalog.cancelSession(sb, id, reason),

    // ── Bookings ──────────────────────────────────────────
    getBookings: (familyId) => bookings.getBookings(sb, familyId),
    getAllBookings: () => bookings.getAllBookings(sb),
    getBookingsForTeacher: () => bookings.getBookingsForTeacher(sb),
    bookClassSession: (childId, sessionId) => bookings.bookClassSession(sb, childId, sessionId),
    joinWaitlist: (childId, sessionId) => bookings.joinWaitlist(sb, childId, sessionId),
    cancelBooking: (id, opts) => bookings.cancelBooking(sb, id, opts),
    getWaitingList: () => bookings.getWaitingList(sb),

    // ── Payments ──────────────────────────────────────────
    getPriceQuote: (type, familyId) => payments.getPriceQuote(sb, type, familyId),
    getPayments: (familyId) => payments.getPayments(sb, familyId),
    getAllPayments: (opts) => payments.getAllPayments(sb, opts),
    submitPayment: (intent) => payments.submitPayment(sb, intent),
    getProofUrl: (id) => payments.getProofUrl(sb, id),
    verifyPayment: (id, action, note) => payments.verifyPayment(sb, id, action, note),
    adminRecordPayment: (input) => payments.adminRecordPayment(sb, input),

    // ── Assessments / reports / attendance ────────────────
    getAssessments: (familyId) => assessments.getAssessments(sb, familyId),
    getTeacherAssessments: () => assessments.getTeacherAssessments(sb),
    createTeacherAssessments: (rows) => assessments.createTeacherAssessments(sb, rows),
    updateAssessment: (id, patch) => assessments.updateAssessment(sb, id, patch),
    getReportsForChild: (childId) => assessments.getReportsForChild(sb, childId),
    getTeacherReports: () => assessments.getTeacherReports(sb),
    createReport: (report) => assessments.createReport(sb, report),
    getAttendance: (sessionId) => assessments.getAttendance(sb, sessionId),
    getChildAttendance: (childId) => assessments.getChildAttendance(sb, childId),
    saveAttendance: (sessionId, records) => assessments.saveAttendance(sb, sessionId, records),

    // ── Messaging ─────────────────────────────────────────
    getConversations: () => messaging.getConversations(sb),
    startConversation: (kind, target) => messaging.startConversation(sb, kind, target),
    getMessages: (convId) => messaging.getMessages(sb, convId),
    sendMessage: (convId, body) => messaging.sendMessage(sb, convId, body),
    markConversationRead: (convId) => messaging.markConversationRead(sb, convId),
    onMessagesChange: (convId, cb) => messaging.onMessagesChange(sb, convId, cb),

    // ── Settings & content ────────────────────────────────
    getSettings: () => settings.getSettings(sb),
    getDocuments: () => settings.getDocuments(sb),

    // ── Notifications & devices ───────────────────────────
    getNotifications: (limit) => notifications.getNotifications(sb, limit),
    markNotificationRead: (id) => notifications.markNotificationRead(sb, id),
    markAllNotificationsRead: () => notifications.markAllNotificationsRead(sb),
    getNotificationPrefs: () => notifications.getNotificationPrefs(sb),
    setNotificationPref: (category, v) => notifications.setNotificationPref(sb, category, v),
    registerDevice: (token, platform, meta) => notifications.registerDevice(sb, token, platform, meta),
    unregisterDevice: (token) => notifications.unregisterDevice(sb, token),

    // ── Learning Shop ────────────────────────────────────
    getShopProducts: () => shop.getShopProducts(sb),
    getShopOrders: (familyId) => shop.getShopOrders(sb, familyId),
    getAllShopOrders: (opts) => shop.getAllShopOrders(sb, opts),
    getShopStats: () => shop.getShopStats(sb),
    placeOrder: (input) => shop.placeOrder(sb, input),
    verifyShopOrder: (id, action, note) => shop.verifyShopOrder(sb, id, action, note),
    updateShopOrderStatus: (id, status, note) => shop.updateShopOrderStatus(sb, id, status, note),
    getShopReceiptUrl: (id) => shop.getShopReceiptUrl(sb, id),
    getAdminShopProducts: () => shop.getAdminShopProducts(sb),
    upsertShopProduct: (p) => shop.upsertShopProduct(sb, p),
    uploadShopProductImage: (id) => shop.uploadShopProductImage(sb, id),

    // ── Admin ─────────────────────────────────────────────
    getAdminStats: () => admin.getAdminStats(sb),
    inviteStaff: (input) => admin.inviteStaff(sb, input),
    deleteMyAccount: () => admin.deleteMyAccount(sb),
  };
}
