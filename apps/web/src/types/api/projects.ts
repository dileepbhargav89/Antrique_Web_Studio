import type { SortDirection } from './common';

/** Phase 7 (Project/Task/Milestone) — the one genuine greenfield build the workflow audit
 * found (docs/implementation/phase-7-workflow-matrix.md): schema fully modeled since Phase
 * 1.1A, zero application-layer consumers until now. */

export type ProjectStatus =
  'DRAFT' | 'ACTIVE' | 'IN_REVIEW' | 'LAUNCHED' | 'MAINTENANCE' | 'ARCHIVED';

/** Excludes ARCHIVED — reached only via the dedicated archive action, not the general update. */
export type ProjectUpdatableStatus = Exclude<ProjectStatus, 'ARCHIVED'>;

export interface Project {
  id: string;
  clientId: string;
  leadId: string | null;
  name: string;
  summary: string | null;
  status: ProjectStatus;
  startDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberRole = 'OWNER' | 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';

export interface ProjectMember {
  userId: string;
  role: ProjectMemberRole;
  addedAt: string;
}

export interface ProjectDetail extends Project {
  completionPercent: number;
  members: readonly ProjectMember[];
}

export type ProjectSortField = 'createdAt' | 'name' | 'status';

export interface ProjectListParams {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  clientId?: string;
  search?: string;
  sortBy?: ProjectSortField;
  sortDirection?: SortDirection;
}

export interface CreateProjectInput {
  clientId: string;
  leadId?: string;
  name: string;
  summary?: string;
  startDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  summary?: string;
  startDate?: string;
  status?: ProjectUpdatableStatus;
}

export interface AddProjectMemberInput {
  userId: string;
  role?: ProjectMemberRole;
}

export type MilestoneStatus =
  'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneListParams {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: MilestoneStatus;
  sortBy?: 'createdAt' | 'dueDate' | 'status';
  sortDirection?: SortDirection;
}

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: MilestoneStatus;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Internal delivery-team tool, not client-facing — see the backend Task model's own
 * schema comment. */
export interface Task {
  id: string;
  projectId: string;
  milestoneId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  projectId?: string;
  milestoneId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy?: 'createdAt' | 'dueDate' | 'status' | 'priority';
  sortDirection?: SortDirection;
}

export interface CreateTaskInput {
  projectId: string;
  milestoneId?: string;
  assigneeId?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskInput {
  milestoneId?: string;
  assigneeId?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export type DocumentStatus = 'UPLOADING' | 'READY' | 'QUARANTINED' | 'FAILED';

export interface ProjectDocument {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  /** Serialized as a string on the wire — BigInt on the backend. */
  sizeBytes: string;
  url: string;
  status: DocumentStatus;
  createdAt: string;
}

/** Exactly one of taskId/milestoneId — enforced by a DB CHECK constraint on the backend. */
export interface Comment {
  id: string;
  taskId: string | null;
  milestoneId: string | null;
  authorId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentListParams {
  page?: number;
  limit?: number;
  taskId?: string;
  milestoneId?: string;
}

export interface CreateCommentInput {
  taskId?: string;
  milestoneId?: string;
  body: string;
}

/** Backs the Project workspace's "Activity" tab — apps/api's ActivityLog model. */
export interface ActivityLogEntry {
  id: string;
  projectId: string | null;
  actorUserId: string | null;
  verb: string;
  summary: string;
  metadata: unknown;
  createdAt: string;
}
