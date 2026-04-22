export type Role = 'admin' | 'operador' | 'supervisor';
export type BoxStatus = 'empty' | 'partial' | 'full' | 'spent';

export interface Profile {
  id: string;
  role: Role;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  min_stock?: number;
  created_at: string;
}

export interface Box {
  id: string;
  warehouse_id: string;
  box_number: number;
  status: BoxStatus;
  current_onu_count: number;
  created_at: string;
}

export interface Onu {
  id: string;
  serial: string;
  model: string;
  mac: string;
  consecutive: string;
  status: string;
  box_id: string | null;
  created_at: string;
}

export interface Movement {
  id: string;
  type: 'ingreso' | 'transferencia' | 'consumo' | 'ajuste';
  from_warehouse: string | null;
  to_warehouse: string | null;
  box_id: string | null;
  quantity: number;
  user_id: string;
  created_at: string;
}
