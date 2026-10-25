import type { Family, Child, ChildPatch, NewChild, EnrolmentInput } from '../../types/family';
import type { Term, GatingSnapshot } from '../../types/term';
import type { ClassBooking, BookingCancelResult, Assessment, StudentReport, NewReport, AttendanceRecord } from '../../types/booking';
import type { Payment, PaymentIntent, PriceQuote } from '../../types/payment';
import type { Teacher, ClassSlot, ClassSession, ClassSlotInput, Program } from '../../types/teacher';
import type { Conversation, ChatMessage, Notification, NotificationCategory, ConversationKind } from '../../types/message';
import type { AdminStats } from '../../types/admin';
import type { AuthUser } from '../../types/auth';
import type { ShopProduct, ShopOrder, PlaceOrderInput, PlacedOrder, ShopStats, AdminShopProduct, ShopProductInput } from '../../types/shop';

export interface DataClient {
  // ── Auth ───────────────────────────────────────────────
  signIn(email: string, password: string): Promise<AuthUser>;
  requestSignupOtp(input: { email: string; firstName: string; lastName: string; phone?: string }): Promise<void>;
  requestPasswordResetOtp(email: string): Promise<void>;
  verifyOtp(email: string, code: string, purpose: 'signup' | 'recovery'): Promise<void>;
  setPassword(newPassword: string): Promise<void>;
  signOut(): Promise<void>;
  getMyContext(): Promise<AuthUser | null>;
  onAuthChange(cb: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'TOKEN_REFRESHED') => void): () => void;

  // ── Families & children ───────────────────────────────
  getFamily(familyId: string): Promise<Family>;
  getAllFamilies(): Promise<Family[]>;
  createFamily(input: { parentName: string; email?: string; phone?: string }): Promise<Family>;
  updateFamily(familyId: string, patch: Partial<Pick<Family, 'parent_name' | 'phone'>>): Promise<Family>;
  getChildren(familyId: string): Promise<Child[]>;
  getAllChildren(): Promise<Child[]>;
  addChild(familyId: string, child: NewChild): Promise<Child>;
  updateChild(childId: string, patch: ChildPatch): Promise<Child>;
  completeEnrolment(childId: string, input: EnrolmentInput): Promise<Child>;
  adminMarkEnrolled(childId: string, note?: string): Promise<Child>;

  // ── Terms & gating ────────────────────────────────────
  getTerms(familyId: string): Promise<Term[]>;
  getAllTerms(): Promise<Term[]>;
  getGating(familyId: string): Promise<GatingSnapshot>;
  adminAdjustCredits(termId: string, delta: number, note: string): Promise<Term>;

  // ── Catalog & sessions ────────────────────────────────
  getPrograms(): Promise<Program[]>;
  upsertProgram(p: { id?: string; name: string; description?: string; color?: string; is_active?: boolean }): Promise<Program>;
  getTeachers(): Promise<Teacher[]>;
  getClassSlots(): Promise<ClassSlot[]>;
  createClassSlot(input: ClassSlotInput): Promise<ClassSlot>;
  updateClassSlot(id: string, patch: Partial<ClassSlotInput>): Promise<ClassSlot>;
  deactivateClassSlot(id: string, cancelFuture?: boolean): Promise<number>;
  getUpcomingSessions(opts?: { from?: string; to?: string; classId?: string; teacherId?: string }): Promise<ClassSession[]>;
  cancelSession(sessionId: string, reason?: string): Promise<number>;

  // ── Bookings ──────────────────────────────────────────
  getBookings(familyId: string): Promise<ClassBooking[]>;
  getAllBookings(): Promise<ClassBooking[]>;
  getBookingsForTeacher(): Promise<ClassBooking[]>;
  bookClassSession(childId: string, sessionId: string): Promise<ClassBooking>;
  joinWaitlist(childId: string, sessionId: string): Promise<ClassBooking>;
  cancelBooking(bookingId: string, opts?: { restoreCredit?: boolean }): Promise<BookingCancelResult>;
  getWaitingList(): Promise<ClassBooking[]>;

  // ── Payments ──────────────────────────────────────────
  getPriceQuote(type: Payment['type'], familyId: string): Promise<PriceQuote>;
  getPayments(familyId: string): Promise<Payment[]>;
  getAllPayments(opts?: { status?: Payment['status'] }): Promise<Payment[]>;
  submitPayment(intent: PaymentIntent): Promise<Payment>;
  getProofUrl(paymentId: string): Promise<string>;
  verifyPayment(paymentId: string, action: 'approve' | 'reject', note?: string): Promise<Payment>;
  adminRecordPayment(input: { familyId: string; type: 'term' | 'individual_class'; childId?: string; sessionId?: string; note?: string }): Promise<Payment>;

  // ── Assessments / reports / attendance ────────────────
  getAssessments(familyId: string): Promise<Assessment[]>;
  getTeacherAssessments(): Promise<Assessment[]>;
  createTeacherAssessments(rows: Array<{ childId: string; classId?: string; date: string; time: string }>): Promise<Assessment[]>;
  updateAssessment(id: string, patch: Partial<Pick<Assessment, 'status' | 'scheduled_date' | 'scheduled_time' | 'notes'>>): Promise<Assessment>;
  getReportsForChild(childId: string): Promise<StudentReport[]>;
  getTeacherReports(): Promise<StudentReport[]>;
  createReport(report: NewReport): Promise<StudentReport>;
  getAttendance(sessionId: string): Promise<AttendanceRecord[]>;
  getChildAttendance(childId: string): Promise<AttendanceRecord[]>;
  saveAttendance(sessionId: string, records: Array<{ childId: string; status: AttendanceRecord['status'] }>): Promise<number>;

  // ── Messaging ─────────────────────────────────────────
  getConversations(): Promise<Conversation[]>;
  startConversation(kind: ConversationKind, target: { familyId?: string; teacherId?: string }): Promise<string>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  sendMessage(conversationId: string, body: string): Promise<ChatMessage>;
  markConversationRead(conversationId: string): Promise<void>;
  onMessagesChange(conversationId: string, callback: (message: ChatMessage) => void): { unsubscribe(): void };

  // ── Settings & content ───────────────────────────────
  getSettings(): Promise<Record<string, unknown>>;
  getDocuments(): Promise<Record<string, string>>;

  // ── Notifications & devices ───────────────────────────
  getNotifications(limit?: number): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  getNotificationPrefs(): Promise<Record<NotificationCategory, { push: boolean; inApp: boolean }>>;
  setNotificationPref(category: NotificationCategory, v: { push?: boolean; inApp?: boolean }): Promise<void>;
  registerDevice(token: string, platform: 'web' | 'ios' | 'android', meta?: { appVersion?: string; locale?: string }): Promise<void>;
  unregisterDevice(token: string): Promise<void>;

  // ── Learning Shop ────────────────────────────────────
  getShopProducts(): Promise<ShopProduct[]>;
  getShopOrders(familyId: string): Promise<ShopOrder[]>;
  getAllShopOrders(opts?: { limit?: number; offset?: number }): Promise<ShopOrder[]>;
  getShopStats(): Promise<ShopStats>;
  placeOrder(input: PlaceOrderInput): Promise<PlacedOrder>;
  verifyShopOrder(orderId: string, action: 'approve' | 'reject', note?: string): Promise<void>;
  updateShopOrderStatus(orderId: string, status: ShopOrder['status'], note?: string): Promise<void>;
  getShopReceiptUrl(orderId: string): Promise<string | null>;
  getAdminShopProducts(): Promise<AdminShopProduct[]>;
  upsertShopProduct(p: ShopProductInput): Promise<AdminShopProduct>;
  uploadShopProductImage(productId: string): Promise<string>;

  // ── Admin ─────────────────────────────────────────────
  getAdminStats(): Promise<AdminStats>;
  inviteStaff(input: { email: string; fullName: string; role: 'teacher' | 'admin'; subjects?: string[]; color?: string }): Promise<void>;
  deleteMyAccount(): Promise<void>;
}
