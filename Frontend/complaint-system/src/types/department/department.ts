export interface Department {
  id: number;
  department_name: string;
  description: string;
  department_account?: {
    id: number;
    user_id: number;
    department_id: number;
  };
}