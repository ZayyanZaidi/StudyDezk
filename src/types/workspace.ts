export interface Workspace {
  id: string;
  name: string;
  course: string;
  description?: string;
  color: string; // e.g. 'blue', 'amber', 'emerald', 'indigo', 'rose'
  icon?: string;
  createdAt: number;
  updatedAt: number;
}
