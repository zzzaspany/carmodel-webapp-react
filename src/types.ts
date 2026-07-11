export interface CarModelRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  name?: string;
  model?: string;
  brand?: string;
  make?: string;
  title?: string;
  year?: number | string;
  price?: number | string;
  type?: string;
  category?: string;
  description?: string;
  image?: string;
  photo?: string;
  photos?: string[] | string;
  transmission?: string;
  fuelType?: string;
  [key: string]: any;
}

export interface PocketBaseResponse {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: CarModelRecord[];
}

export interface ConnectionStatus {
  connected: boolean;
  checking: boolean;
  error: string | null;
  serverInfo?: {
    version?: string;
    [key: string]: any;
  };
}
