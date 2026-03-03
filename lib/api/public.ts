import { apiClient, getApiError } from "./client";
import type {
  PublicMenuResponse,
  ValidateCartRequest,
  CreateOrderRequest,
  CreateOrderResponse,
} from "@/lib/types";

export async function fetchPublicMenu(
  merchantId: string,
  tableCode?: string
): Promise<PublicMenuResponse> {
  const params: Record<string, string> = { merchantId };
  if (tableCode) params.tableCode = tableCode;
  const { data } = await apiClient.get<PublicMenuResponse>(
    `/public/menu`,
    { params }
  );
  return data;
} 

export interface ValidateCartResult {
  is_valid: boolean;
  errors: string[];
  totals: { subtotal: number; total: number };
  line_items: Array<{
    item_id: string;
    variant_id: string | null;
    unit_price: number;
    qty: number;
    line_total: number;
  }>;
}

export async function validateCart(
  body: ValidateCartRequest,
): Promise<ValidateCartResult> {
  const { data } = await apiClient.post<ValidateCartResult>(
    "/public/cart/validate",
    body,
  );
  return data;
}

export async function createOrder(
  body: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post<CreateOrderResponse>("/orders", body);
  return data;
}

export { getApiError };
