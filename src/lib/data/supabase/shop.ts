import type { AppSupabase } from '../../supabase';
import type { ShopProduct, ShopOrder, ShopOrderItem, PlaceOrderInput, PlacedOrder, ShopStats, AdminShopProduct, ShopProductInput } from '../../../types/shop';
import { toAppError } from '../errors';
import { rpc } from './rpc';

// ── Helpers ───────────────────────────────────────────────────────────────────

const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
const alreadyExists = (m?: string) => /already exists|duplicate/i.test(m ?? '');

function toProduct(r: any): ShopProduct {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    description: r.description ?? '',
    details: r.details ?? '',
    price_cents: r.price_cents,
    image_url: null, // resolved by caller if image_path present
    status: r.status ?? 'In Stock',
  };
}

function toOrder(r: any): ShopOrder {
  return {
    id: r.id,
    order_number: r.order_number ?? r.id,
    family_id: r.family_id ?? null,
    family_name: r.customer_name ?? r.family_name,
    source: r.source,
    items: (r.items ?? r.shop_order_items ?? []).map((i: any): ShopOrderItem => ({
      product_id: i.product_id ?? null,
      title: i.title,
      unit_price_cents: i.unit_price_cents,
      quantity: i.quantity,
    })),
    subtotal_cents: r.subtotal_cents ?? r.total_cents ?? 0,
    shipping_cents: r.shipping_cents ?? 0,
    total_cents: r.total_cents ?? 0,
    status: r.status,
    payment_method: r.payment_method,
    payment_status: r.payment_status,
    receipt_filename: r.receipt_filename ?? undefined,
    review_note: r.review_note ?? undefined,
    delivery_name: r.delivery_name,
    delivery_address: r.delivery_address,
    delivery_phone: r.delivery_phone,
    delivery_email: r.delivery_email ?? undefined,
    created_at: r.created_at,
  };
}

// ── Public shop ───────────────────────────────────────────────────────────────

export async function getShopProducts(sb: AppSupabase): Promise<ShopProduct[]> {
  const rows = await rpc<any[]>(sb, 'get_shop_products');
  return (rows ?? []).map(r => {
    const p = toProduct(r);
    if (r.image_path) {
      p.image_url = sb.storage.from('shop-products').getPublicUrl(r.image_path).data.publicUrl;
    }
    return p;
  });
}

export async function getShopOrders(sb: AppSupabase, familyId: string): Promise<ShopOrder[]> {
  const { data, error } = await sb
    .from('shop_orders')
    .select('*, items:shop_order_items(product_id,title,unit_price_cents,quantity)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw toAppError(error);
  return (data ?? []).map(toOrder);
}

// ── Admin shop ────────────────────────────────────────────────────────────────

export async function getAllShopOrders(
  sb: AppSupabase,
  opts?: { limit?: number; offset?: number }
): Promise<ShopOrder[]> {
  const limit  = opts?.limit  ?? 50;
  const offset = opts?.offset ?? 0;
  const { data, error } = await sb
    .from('shop_orders')
    .select('*, items:shop_order_items(product_id,title,unit_price_cents,quantity)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw toAppError(error);
  return (data ?? []).map(toOrder);
}

export async function getShopStats(sb: AppSupabase): Promise<ShopStats> {
  // RPC name matches the web portal: admin_shop_stats
  return rpc<ShopStats>(sb, 'admin_shop_stats');
}

export async function verifyShopOrder(
  sb: AppSupabase,
  orderId: string,
  action: 'approve' | 'reject',
  note?: string
): Promise<void> {
  await rpc(sb, 'verify_shop_order', { p_order_id: orderId, p_action: action, p_note: note ?? null });
}

export async function updateShopOrderStatus(
  sb: AppSupabase,
  orderId: string,
  status: string,
  note?: string
): Promise<void> {
  await rpc(sb, 'admin_update_shop_order_status', { p_order_id: orderId, p_status: status, p_note: note ?? null });
}

export async function getShopReceiptUrl(sb: AppSupabase, orderId: string): Promise<string | null> {
  const { data, error } = await sb
    .from('shop_orders')
    .select('receipt_path')
    .eq('id', orderId)
    .single();

  if (error || !data?.receipt_path) return null;

  const { data: url } = await sb.storage
    .from('shop-receipts')
    .createSignedUrl(data.receipt_path, 300);

  return url?.signedUrl ?? null;
}

export async function getAdminShopProducts(sb: AppSupabase): Promise<AdminShopProduct[]> {
  const { data, error } = await sb.from('shop_products').select('*').order('sort_order');
  if (error) throw toAppError(error);
  return (data ?? []).map((r: any): AdminShopProduct => ({
    ...toProduct(r),
    image_url: r.image_path
      ? sb.storage.from('shop-products').getPublicUrl(r.image_path).data.publicUrl
      : null,
    stock_quantity: r.stock_quantity,
    low_stock_threshold: r.low_stock_threshold,
    is_active: r.is_active,
    sort_order: r.sort_order,
  }));
}

export async function upsertShopProduct(sb: AppSupabase, p: ShopProductInput): Promise<AdminShopProduct> {
  const row: Record<string, unknown> = {};
  if (p.id               !== undefined) row.id                = p.id;
  if (p.title            !== undefined) row.title             = p.title;
  if (p.category         !== undefined) row.category          = p.category;
  if (p.description      !== undefined) row.description       = p.description;
  if (p.details          !== undefined) row.details           = p.details;
  if (p.price_cents      !== undefined) row.price_cents       = p.price_cents;
  if (p.stock_quantity   !== undefined) row.stock_quantity    = p.stock_quantity;
  if (p.low_stock_threshold !== undefined) row.low_stock_threshold = p.low_stock_threshold;
  if (p.is_active        !== undefined) row.is_active         = p.is_active;
  if (p.sort_order       !== undefined) row.sort_order        = p.sort_order;
  if (p.image_path       !== undefined) row.image_path        = p.image_path;

  const { data, error } = await sb.from('shop_products').upsert(row).select('*').single();
  if (error) throw toAppError(error);

  return {
    ...toProduct(data),
    image_url: data.image_path
      ? sb.storage.from('shop-products').getPublicUrl(data.image_path).data.publicUrl
      : null,
    stock_quantity: data.stock_quantity,
    low_stock_threshold: data.low_stock_threshold,
    is_active: data.is_active,
    sort_order: data.sort_order,
  };
}

export async function uploadShopProductImage(sb: AppSupabase, productId: string, file: { uri: string; name: string; type: string }): Promise<string> {
  const path = `${productId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await sb.storage
    .from('shop-products')
    .upload(path, { uri: file.uri, name: file.name, type: file.type } as any, {
      contentType: file.type,
      upsert: false,
    });
  if (error && !alreadyExists(error.message)) throw toAppError(error);
  return path;
}

// ── Order placement ───────────────────────────────────────────────────────────

export async function placeOrder(sb: AppSupabase, input: PlaceOrderInput): Promise<PlacedOrder> {
  // Mobile only supports portal orders (logged-in family)
  let path: string | null = null;

  if (input.paymentMethod === 'advance' && input.receipt) {
    const ctx = await rpc<{ family_id: string }>(sb, 'get_my_context');
    const receipt = input.receipt as any;
    const name = receipt.name ?? 'receipt.jpg';
    // Resolve a real MIME type — never fall back to octet-stream, which
    // Supabase Storage rejects. Prefer an explicit mimeType, then the
    // file extension, then image/jpeg as a last resort.
    const mime =
      receipt.mimeType ||
      receipt.type ||
      (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    path = `${ctx.family_id}/${input.orderId}/${safeName(name)}`;
    const up = await sb.storage.from('shop-receipts').upload(
      path,
      { uri: receipt.uri, name, type: mime } as any,
      { contentType: mime, upsert: false }
    );
    if (up.error && !alreadyExists(up.error.message)) throw toAppError(up.error);
  }

  const o = await rpc<any>(sb, 'place_portal_order', {
    p_id: input.orderId,
    p_items: input.items.map((i: any) => ({ product_id: i.productId, quantity: i.quantity })),
    p_method: input.paymentMethod,
    p_delivery: input.delivery,
    p_receipt_path: path,
    p_receipt_filename: (input.receipt as any)?.name ?? null,
  });

  return { id: o.id, order_number: o.order_number, total_cents: o.total_cents };
}
