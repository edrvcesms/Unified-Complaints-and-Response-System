import type { UserData } from "../general/user";

export interface DepartmentAccount {
  id: number;
  department_name: string;
  description: string;
  department_account: DepartmentAccountData;
}

export interface DepartmentAccountData {
  id: number;
  user_id: number;
  department_id: number;
  user: UserData;
}