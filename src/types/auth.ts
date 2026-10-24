export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  role: 'parent' | 'teacher' | 'admin';
  familyId: string | null;
  teacherId: string | null;
}

export interface GetMyContextResult {
  id: string;
  email: string;
  full_name: string;
  role: 'parent' | 'teacher' | 'admin';
  family_id: string | null;
  teacher_id: string | null;
}
