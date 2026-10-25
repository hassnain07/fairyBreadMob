import type { AppSupabase } from '../../supabase';
import type { ShopProduct, ShopOrder, PlaceOrderInput, PlacedOrder, ShopStats, AdminShopProduct, ShopProductInput } from '../../../types/shop';
import { toAppError } from '../errors';
import { rpc } from './rpc';

export async function getShopProducts(sb: AppSupabase): Promise<ShopProduct[]> {
  const { data, error } = await sb
    .from('shop_products')
    .select('*')
    .eq('is_active', true);

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function getShopOrders(sb: AppSupabase, familyId: string): Promise<ShopOrder[]> {
  throw new Error('Not yet implemented: getShopOrders');
}

export async function getAllShopOrders(
  sb: AppSupabase,
  opts?: { limit?: number; offset?: number }
): Promise<ShopOrder[]> {
  throw new Error('Not yet implemented: getAllShopOrders');
}

export async function getShopStats(sb: AppSupabase): Promise<ShopStats> {
  throw new Error('Not yet implemented: getShopStats');
}

export async function placeOrder(sb: AppSupabase, input: PlaceOrderInput): Promise<PlacedOrder> {
  throw new Error('Not yet implemented: placeOrder');
}

export async function verifyShopOrder(
  sb: AppSupabase,
  orderId: string,
  action: 'approve' | 'reject',
  note?: string
): Promise<void> {
  throw new Error('Not yet implemented: verifyShopOrder');
}

export async function updateShopOrderStatus(
  sb: AppSupabase,
  orderId: string,
  status: ShopOrder['status'],
  note?: string
): Promise<void> {
  throw new Error('Not yet implemented: updateShopOrderStatus');
}

export async function getShopReceiptUrl(sb: AppSupabase, orderId: string): Promise<string | null> {
  throw new Error('Not yet implemented: getShopReceiptUrl');
}

export async function getAdminShopProducts(sb: AppSupabase): Promise<AdminShopProduct[]> {
  throw new Error('Not yet implemented: getAdminShopProducts');
}

export async function upsertShopProduct(sb: AppSupabase, p: ShopProductInput): Promise<AdminShopProduct> {
  throw new Error('Not yet implemented: upsertShopProduct');
}

export async function uploadShopProductImage(sb: AppSupabase, productId: string): Promise<string> {
  throw new Error('Not yet implemented: uploadShopProductImage');
}
