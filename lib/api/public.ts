import { apiClient, getApiError } from "./client";
import type {
  PublicMenuResponse,
  CreateOrderResponse,
  CartLineItem,
} from "@/lib/types";

/**
 * First step after scanning QR. Returns merchant, branch, table info and list of menus (no categories/items).
 * GET /public/scan?t=TOKEN
 */
export interface PublicScanResponse {
  merchant_id: string | number;
  merchant_name: string | null;
  merchant_logo: string | null;
  branch_id: string | number;
  branch_name: string | null;
  table_id: string | number;
  table_name: string | null;
  /** Optional: needed for create order when using token flow. */
  table_code?: string | null;
  menus: Array<{
    id: number | string;
    name_ar?: string | null;
    name_en?: string | null;
    currancy?: string;
    is_active?: boolean;
    created_at?: string;
  }>;
}

export async function fetchPublicScan(token: string): Promise<PublicScanResponse> {
  const { data } = await apiClient.get<PublicScanResponse>("/public/scan", {
    params: { t: token },
  });
  return data;
}

/**
 * Fetch public menu (legacy: merchantId + tableCode, or single menu by token).
 * - Merchant: GET /public/menu?merchantId=...&tableCode=...
 * - Token + menuId: use fetchPublicMenuById instead (GET /public/menu/:menuId?t=TOKEN).
 */
export async function fetchPublicMenu(
  merchantId?: string,
  tableCode?: string,
  _token?: string,
  _menuId?: string | number
): Promise<PublicMenuResponse> {
  const params: Record<string, string> = {};
  if (merchantId) params.merchantId = merchantId;
  if (tableCode) params.tableCode = tableCode;
  const { data } = await apiClient.get<PublicMenuResponse>(
    `/public/menu`,
    { params }
  );
  return data;
}

/**
 * Get a single menu by id with full details (token required).
 * GET /public/menu/:menuId?t=TOKEN
 * Backend returns { menu, categories }. Use with scan data to build full PublicMenuResponse (merchant_id, branch_id, table_id).
 */
export interface PublicMenuByIdResponse {
  menu: PublicMenuResponse["menu"];
  categories: PublicMenuResponse["categories"];
  merchant_id?: string | null;
  branch_id?: string | null;
  table_id?: string | null;
  table_code?: string | null;
}

export async function fetchPublicMenuById(
  menuId: string | number,
  token: string
): Promise<PublicMenuByIdResponse> {
  const { data } = await apiClient.get<PublicMenuByIdResponse>(
    `/public/menu/${menuId}`,
    { params: { t: token } }
  );
  return data;
} 

/**
 * Request body for POST /orders.
 * - item_id: string
 * - variant_id: only when present (omit when no variant)
 * - quantity: number
 * - modifiers: array of { modifier_id, quantity }
 */
export type CreateOrderRequestBody = {
  items: Array<{
    item_id: string;
    variant_id?: string;
    quantity: number;
    modifiers: Array<{ modifier_id: string; quantity: number }>;
  }>;
};

function buildCreateOrderBody(lineItems: CartLineItem[]): CreateOrderRequestBody {
  return {
    items: lineItems.map((line) => {
      const item: CreateOrderRequestBody["items"][0] = {
        item_id: String(line.item_id),
        quantity: line.quantity,
        modifiers: line.modifiers.map((m) => ({
          modifier_id: String(m.modifier_id),
          quantity: m.quantity,
        })),
      };
      if (line.variant_id != null && line.variant_id !== "") {
        item.variant_id = String(line.variant_id);
      }
      return item;
    }),
  };
}

/**
 * Create order using table token (from QR scan).
 * POST /orders?t=TOKEN with body { items: [...] }.
 * Backend validates token and extracts merchant_id, branch_id, table_id from JWT.
 */
export async function createOrder(
  token: string,
  items: CartLineItem[],
): Promise<CreateOrderResponse> {
  const body = buildCreateOrderBody(items);
  const { data } = await apiClient.post<CreateOrderResponse>(
    "/orders",
    body,
    { params: { t: token } },
  );
  return data;
}

/** Public endpoint: get stored table QR by table id (no auth). */
export interface PublicTableQrcodeResponse {
  id: string;
  table_id: string;
  qr_svg: string;
  qr_url?: string;
}

export async function fetchPublicTableQrcode(
  tableId: string
): Promise<PublicTableQrcodeResponse> {
  const { data } = await apiClient.get<PublicTableQrcodeResponse>(
    `/public/table/${tableId}/qrcode`
  );
  return data;
}

export { getApiError };
