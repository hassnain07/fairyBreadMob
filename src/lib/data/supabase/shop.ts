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
  const { data, error } = await sb
    .from('shop_orders')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function getAllShopOrders(
  sb: AppSupabase,
  opts?: { limit?: number; offset?: number }
): Promise<ShopOrder[]> {
  let q = sb.from('shop_orders').select('*');
  if (opts?.limit) q = q.limit(opts.limit);
  if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts.limit || 10) - 1);
  const { data, error } = await q.order('created_at', { ascending: false });

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function getShopStats(sb: AppSupabase): Promise<ShopStats> {
  const result = await rpc<any>(sb, 'get_shop_stats', {});
  return {
    total_orders: result.total_orders ?? 0,
    pending_orders: result.pending_orders ?? 0,
    total_revenue_cents: result.total_revenue_cents ?? 0,
  };
}

export async function placeOrder(sb: AppSupabase, input: PlaceOrderInput): Promise<PlacedOrder> {
  if (!input.receipt) throw new Error('Receipt is required');

  // Generate stable order ID once per attempt
  const orderId = input.orderId || crypto.randomUUID();

  // Upload receipt to shop-receipts bucket
  const receiptName = input.receipt.name || 'receipt.jpg';
  const safeName = receiptName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const receiptPath = `${input.familyId}/${orderId}/${safeName}`;

  const { error: uploadError } = await sb.storage
    .from('shop-receipts')
    .upload(receiptPath, input.receipt, {
      contentType: input.receipt.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) throw toAppError(uploadError);

  // Call RPC to create order
  const result = await rpc<any>(sb, 'place_portal_order', {
    p_id: orderId,
    p_family_id: input.familyId,
    p_items: input.items,
    p_delivery_method: input.deliveryMethod,
    p_delivery_name: input.deliveryName,
    p_delivery_address: input.deliveryAddress,
    p_delivery_phone: input.deliveryPhone,
    p_delivery_email: input.deliveryEmail ?? null,
    p_receipt_path: receiptPath,
    p_receipt_filename: safeName,
  });

  return {
    id: result.id,
    order_number: result.order_number,
    total_cents: result.total_cents,
  };
}

export async function getShopReceiptUrl(sb: AppSupabase, orderId: string): Promise<string | null> {
  const { data, error } = await sb
    .from('shop_orders')
    .select('receipt_path')
    .eq('id', orderId)
    .single();

  if (error) return null;
  if (!data?.receipt_path) return null;

  const { data: signedData, error: signError } = await sb.storage
    .from('shop-receipts')
    .createSignedUrl(data.receipt_path, 3600);

  if (signError) return null;
  return signedData?.signedUrl || null;
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
