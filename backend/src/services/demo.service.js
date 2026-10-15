import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

/**
 * Demo / sandbox dataset.
 *
 * Everything here is synthetic and flagged is_demo = TRUE. The reset deletes
 * only demo rows, so a real store sharing the same database is never touched.
 * The dataset is deterministic (seeded PRNG) so re-seeding produces the same
 * storefront and dashboard.
 */

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------
function createRng(seed) {
  let state = seed >>> 0;

  return function rng() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const intBetween = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const money = (value) => Math.round(value * 100) / 100;

function dayOffset(days, hourSeed = 0) {
  return new Date(Date.now() - days * 86400000 + hourSeed * 3600000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

// ---------------------------------------------------------------------------
// Static dataset definitions
// ---------------------------------------------------------------------------
const CATEGORIES = [
  {
    name: "Tech Essentials",
    slug: "demo-electronics",
    description: "Everyday tech, audio and smart-home essentials.",
  },
  {
    name: "Apparel",
    slug: "demo-fashion",
    description: "Wardrobe staples and footwear for every season.",
  },
  {
    name: "Home & Living",
    slug: "demo-home-kitchen",
    description: "Small appliances and tools that make home life easier.",
  },
  {
    name: "Beauty & Wellness",
    slug: "demo-beauty",
    description: "Skincare and personal care favourites.",
  },
  {
    name: "Sport & Outdoor",
    slug: "demo-sports",
    description: "Gear for training, travel and the outdoors.",
  },
];

// finalStock is the on-hand quantity after all seeded sales are replayed.
const PRODUCTS = [
  {
    title: 'Aurora 55" 4K Smart TV',
    category: "demo-electronics",
    price: 74990,
    finalStock: 12,
    rating: 4.6,
    reviews: 214,
    description:
      "55-inch 4K UHD smart TV with HDR10, built-in streaming apps and voice remote.",
  },
  {
    title: "Pulse Wireless Earbuds Pro",
    category: "demo-electronics",
    price: 6490,
    finalStock: 34,
    rating: 4.4,
    reviews: 531,
    description:
      "Active noise cancelling earbuds with 30-hour battery life and USB-C fast charge.",
  },
  {
    title: 'Nimbus 14" Ultrabook Laptop',
    category: "demo-electronics",
    price: 89990,
    finalStock: 7,
    rating: 4.7,
    reviews: 96,
    description:
      "Thin-and-light 14-inch laptop with 16 GB RAM, 512 GB SSD and all-day battery.",
  },
  {
    title: "Volt 20000mAh Power Bank",
    category: "demo-electronics",
    price: 3290,
    finalStock: 48,
    rating: 4.3,
    reviews: 388,
    description:
      "Dual-port 20000mAh power bank with 22.5W fast charging for phones and tablets.",
  },
  {
    title: "Echo Smart Home Speaker",
    category: "demo-electronics",
    price: 5490,
    finalStock: 0,
    rating: 4.1,
    reviews: 172,
    description:
      "Compact voice-controlled smart speaker for music, timers and smart-home control.",
  },
  {
    title: "Everline Organic Cotton Tee",
    category: "demo-fashion",
    price: 890,
    finalStock: 60,
    rating: 4.5,
    reviews: 640,
    description:
      "Soft 100% organic cotton crew-neck t-shirt that holds its shape wash after wash.",
  },
  {
    title: "Trailhead Running Shoes",
    category: "demo-fashion",
    price: 4590,
    finalStock: 3,
    rating: 4.4,
    reviews: 205,
    description:
      "Lightweight running shoes with responsive cushioning and a breathable knit upper.",
  },
  {
    title: "Northwind Denim Jacket",
    category: "demo-fashion",
    price: 3990,
    finalStock: 22,
    rating: 4.2,
    reviews: 143,
    description:
      "Classic mid-wash denim jacket with a regular fit and durable metal hardware.",
  },
  {
    title: "Harbor Leather Wallet",
    category: "demo-fashion",
    price: 1490,
    finalStock: 40,
    rating: 4.6,
    reviews: 267,
    description:
      "Full-grain leather bifold wallet with RFID blocking and eight card slots.",
  },
  {
    title: "BrewMaster Drip Coffee Maker",
    category: "demo-home-kitchen",
    price: 5490,
    finalStock: 18,
    rating: 4.3,
    reviews: 312,
    description:
      "12-cup drip coffee maker with programmable timer and reusable filter.",
  },
  {
    title: "PureAir HEPA Air Purifier",
    category: "demo-home-kitchen",
    price: 12990,
    finalStock: 9,
    rating: 4.5,
    reviews: 158,
    description:
      "True-HEPA air purifier for rooms up to 40 m² with quiet night mode.",
  },
  {
    title: "Ceramic Cookware Set (8 pc)",
    category: "demo-home-kitchen",
    price: 6990,
    finalStock: 15,
    rating: 4.2,
    reviews: 121,
    description:
      "Non-stick ceramic cookware set, oven-safe and free from PFOA.",
  },
  {
    title: "Glow Vitamin C Serum",
    category: "demo-beauty",
    price: 1290,
    finalStock: 55,
    rating: 4.6,
    reviews: 720,
    description:
      "Brightening 10% vitamin C serum with hyaluronic acid for daily use.",
  },
  {
    title: "Silk Repair Hair Mask",
    category: "demo-beauty",
    price: 990,
    finalStock: 4,
    rating: 4.4,
    reviews: 289,
    description:
      "Deep-conditioning hair mask with keratin and argan oil for dry, damaged hair.",
  },
  {
    title: "FlexFit Non-Slip Yoga Mat",
    category: "demo-sports",
    price: 1990,
    finalStock: 30,
    rating: 4.5,
    reviews: 413,
    description:
      "6 mm cushioned yoga mat with a non-slip surface and carry strap.",
  },
  {
    title: "Summit Insulated Bottle 750ml",
    category: "demo-sports",
    price: 1590,
    finalStock: 26,
    rating: 4.7,
    reviews: 356,
    description:
      "Double-wall stainless steel bottle that keeps drinks cold for 24 hours.",
  },
];

const CUSTOMERS = [
  { name: "Ayesha Rahman", city: "Dhaka", area: "Dhanmondi" },
  { name: "Tanvir Ahmed", city: "Chattogram", area: "Agrabad" },
  { name: "Nusrat Jahan", city: "Dhaka", area: "Uttara" },
  { name: "Imran Hossain", city: "Sylhet", area: "Zindabazar" },
  { name: "Farhana Akter", city: "Khulna", area: "Sonadanga" },
  { name: "Rafiq Islam", city: "Rajshahi", area: "Shaheb Bazar" },
  { name: "Sadia Noor", city: "Dhaka", area: "Banani" },
  { name: "Mehedi Hasan", city: "Barishal", area: "Band Road" },
  { name: "Jannatul Ferdous", city: "Rangpur", area: "Dhap" },
];

const CARRIERS = ["NovaExpress", "Pathao Courier", "RedX", "Steadfast"];

// 34 orders spread across the lifecycle so every dashboard screen has content.
const STATUS_PLAN = [
  ...Array(12).fill("delivered"), // 0-11
  ...Array(6).fill("shipped"), // 12-17
  ...Array(4).fill("processing"), // 18-21
  ...Array(3).fill("pending"), // 22-24
  ...Array(4).fill("cancelled"), // 25-28
  ...Array(3).fill("return_requested"), // 29-31
  ...Array(2).fill("returned"), // 32-33
];

const ORDER_DAYS_BY_STATUS = {
  delivered: [25, 88],
  shipped: [5, 14],
  processing: [2, 7],
  pending: [0, 2],
  cancelled: [12, 70],
  return_requested: [22, 45],
  returned: [40, 80],
};

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
async function resetDemoData(client, { keepAdmin = true } = {}) {
  // Deleted in dependency order. Child tables are reached through their demo
  // parent order/user so adding columns to every table is unnecessary.
  await client.query(`
    DELETE FROM public.order_returns
    WHERE is_demo = TRUE
       OR order_id IN (SELECT id FROM public.orders WHERE is_demo = TRUE)
       OR user_id IN (SELECT id FROM public.users WHERE is_demo = TRUE)
  `);

  await client.query(`
    DELETE FROM public.order_status_history
    WHERE order_id IN (SELECT id FROM public.orders WHERE is_demo = TRUE)
  `);

  await client.query(`
    DELETE FROM public.order_tracking_events
    WHERE order_id IN (SELECT id FROM public.orders WHERE is_demo = TRUE)
  `);

  await client.query(`
    DELETE FROM public.payments
    WHERE order_id IN (SELECT id FROM public.orders WHERE is_demo = TRUE)
  `);

  await client.query(`
    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM public.orders WHERE is_demo = TRUE)
  `);

  await client.query("DELETE FROM public.orders WHERE is_demo = TRUE");

  await client.query(`
    DELETE FROM public.inventory_movements
    WHERE is_demo = TRUE
       OR product_id IN (SELECT id FROM public.products WHERE is_demo = TRUE)
  `);

  await client.query("DELETE FROM public.products WHERE is_demo = TRUE");
  await client.query("DELETE FROM public.categories WHERE is_demo = TRUE");

  await client.query(`
    DELETE FROM public.customer_addresses
    WHERE user_id IN (SELECT id FROM public.users WHERE is_demo = TRUE)
  `);

  // Keep the demo administrator so an active admin session survives a reset
  // (its id is preserved by the upsert below). Every other demo user goes.
  if (keepAdmin) {
    await client.query(
      `DELETE FROM public.users
       WHERE is_demo = TRUE AND LOWER(email) <> LOWER($1)`,
      [env.demo.adminEmail]
    );
  } else {
    await client.query("DELETE FROM public.users WHERE is_demo = TRUE");
  }
}

// ---------------------------------------------------------------------------
// Demo administrator
// ---------------------------------------------------------------------------
/**
 * Creates or refreshes the dedicated demo admin account and returns it.
 * Idempotent: an existing demo admin keeps its id so live sessions survive.
 */
async function upsertDemoAdmin(client) {
  const adminHash = await bcrypt.hash(env.demo.adminPassword, env.bcryptRounds);

  const result = await client.query(
    `INSERT INTO public.users
       (name, email, password_hash, role, is_active, is_demo)
     VALUES ($1, $2, $3, 'admin', TRUE, TRUE)
     ON CONFLICT (LOWER(email)) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       is_active = TRUE,
       is_demo = TRUE,
       updated_at = NOW()
     RETURNING id, name, email, role, is_demo`,
    [env.demo.adminName, env.demo.adminEmail, adminHash]
  );

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seedDemoData(client) {
  const rng = createRng(20260214);

  const categoryIds = new Map();
  const productRows = [];
  const customerRows = [];

  // Demo administrator ---------------------------------------------------
  await upsertDemoAdmin(client);

  // Categories -----------------------------------------------------------
  for (const category of CATEGORIES) {
    const result = await client.query(
      `INSERT INTO public.categories
         (name, slug, description, is_demo, created_at, updated_at)
       VALUES ($1, $2, $3, TRUE, $4, $4)
       RETURNING id`,
      [category.name, category.slug, category.description, dayOffset(120)]
    );

    categoryIds.set(category.slug, result.rows[0].id);
  }

  // Products -------------------------------------------------------------
  for (let index = 0; index < PRODUCTS.length; index += 1) {
    const product = PRODUCTS[index];
    const createdAt = dayOffset(intBetween(rng, 95, 118));
    const sku = `DEMO-${String(index + 1).padStart(3, "0")}`;

    const result = await client.query(
      `INSERT INTO public.products (
         title, description, price, category, category_id, image_url,
         stock, sku, is_published, low_stock_threshold, rating_rate,
         rating_count, is_demo, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$10,$11,TRUE,$12,$12)
       RETURNING id`,
      [
        product.title,
        product.description,
        product.price,
        CATEGORIES.find((c) => c.slug === product.category).name,
        categoryIds.get(product.category),
        `https://picsum.photos/seed/novashop-${index + 1}/600/600`,
        product.finalStock,
        sku,
        env.defaultLowStockThreshold,
        product.rating,
        product.reviews,
        createdAt,
      ]
    );

    productRows.push({
      id: result.rows[0].id,
      title: product.title,
      price: product.price,
      category: product.category,
      finalStock: product.finalStock,
      createdAt,
      sold: 0,
    });
  }

  // Customers + a default address each ----------------------------------
  const customerHash = await bcrypt.hash(env.demo.customerPassword, env.bcryptRounds);

  for (let index = 0; index < CUSTOMERS.length; index += 1) {
    const customer = CUSTOMERS[index];
    const email = `demo.customer${String(index + 1).padStart(2, "0")}@novashop.dev`;
    const phone = `+8801711000${String(index + 1).padStart(3, "0")}`;
    const createdAt = dayOffset(intBetween(rng, 60, 110));

    const userResult = await client.query(
      `INSERT INTO public.users
         (name, email, password_hash, role, is_active, phone, is_demo,
          created_at, updated_at)
       VALUES ($1,$2,$3,'customer',TRUE,$4,TRUE,$5,$5)
       RETURNING id`,
      [customer.name, email, customerHash, phone, createdAt]
    );

    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO public.customer_addresses (
         user_id, label, recipient_name, phone, address_line1, city,
         postal_code, country, is_default, created_at, updated_at
       )
       VALUES ($1,'Home',$2,$3,$4,$5,$6,'Bangladesh',TRUE,$7,$7)`,
      [
        userId,
        customer.name,
        phone,
        `House ${intBetween(rng, 1, 90)}, Road ${intBetween(rng, 1, 20)}, ${customer.area}`,
        customer.city,
        String(1000 + index * 7),
        createdAt,
      ]
    );

    customerRows.push({
      id: userId,
      name: customer.name,
      email,
      phone,
      city: customer.city,
      area: customer.area,
    });
  }

  // Orders ---------------------------------------------------------------
  const catalog = productRows;
  const saleEvents = [];

  const summary = {
    categories: CATEGORIES.length,
    products: PRODUCTS.length,
    customers: CUSTOMERS.length,
    orders: 0,
  };

  for (let index = 0; index < STATUS_PLAN.length; index += 1) {
    const status = STATUS_PLAN[index];
    const customer = customerRows[index % customerRows.length];
    const [minDays, maxDays] = ORDER_DAYS_BY_STATUS[status];
    const days = intBetween(rng, minDays, maxDays);
    const createdAt = dayOffset(days, intBetween(rng, 0, 20));

    const lineItems = buildLineItems(rng, catalog, index);
    const subtotal = money(
      lineItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    );
    const shippingFee = subtotal >= 3000 ? 0 : 60;
    const total = money(subtotal + shippingFee);

    const paymentMethod = rng() < 0.68 ? "cod" : "sslcommerz";
    const channel =
      paymentMethod === "sslcommerz" ? pick(rng, ["bkash", "nagad", "card"]) : null;

    const paymentStatus = resolvePaymentStatus(status, rng);

    const deliveredAt =
      status === "delivered" || status === "returned" || status === "return_requested"
        ? addDays(createdAt, intBetween(rng, 2, 5))
        : null;
    const shippedAt =
      deliveredAt || ["shipped"].includes(status)
        ? addDays(createdAt, intBetween(rng, 1, 2))
        : null;
    const cancelledAt =
      status === "cancelled" ? addDays(createdAt, intBetween(rng, 1, 3)) : null;

    const trackingNumber = shippedAt
      ? `TRK-DEMO-${String(index + 1).padStart(4, "0")}`
      : null;
    const carrier = trackingNumber ? CARRIERS[index % CARRIERS.length] : null;

    const orderResult = await client.query(
      `INSERT INTO public.orders (
         order_number, user_id, customer_name, customer_email,
         customer_phone, shipping_address, shipping_city, shipping_country,
         shipping_postal_code, subtotal, shipping_fee, total, currency,
         status, payment_status, notes, payment_method, payment_channel,
         tracking_number, carrier, tracking_url, is_demo, created_at,
         updated_at, shipped_at, delivered_at, cancelled_at
       )
       VALUES (
         $1,$2,$3,$4,$5,$6,$7,'Bangladesh',$8,$9,$10,$11,$12,$13,$14,$15,
         $16,$17,$18,$19,$20,TRUE,$21,$21,$22,$23,$24
       )
       RETURNING id`,
      [
        `NV-DEMO-${String(index + 1).padStart(4, "0")}`,
        customer.id,
        customer.name,
        customer.email,
        customer.phone,
        `House ${intBetween(rng, 1, 90)}, Road ${intBetween(rng, 1, 20)}, ${customer.area}`,
        customer.city,
        String(1000 + index * 3),
        subtotal,
        shippingFee,
        total,
        env.currency,
        status,
        paymentStatus,
        index % 5 === 0 ? "Please call before delivery." : null,
        paymentMethod,
        channel,
        trackingNumber,
        carrier,
        trackingNumber ? `https://tracking.example.com/${trackingNumber}` : null,
        createdAt,
        shippedAt,
        deliveredAt,
        cancelledAt,
      ]
    );

    const orderId = orderResult.rows[0].id;
    summary.orders += 1;

    for (const line of lineItems) {
      await client.query(
        `INSERT INTO public.order_items
           (order_id, product_id, product_title, unit_price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          orderId,
          line.productId,
          line.productTitle,
          line.unitPrice,
          line.quantity,
          money(line.unitPrice * line.quantity),
        ]
      );

      line.productRef.sold += line.quantity;
      saleEvents.push({
        productRef: line.productRef,
        quantity: line.quantity,
        at: createdAt,
      });
    }

    await insertStatusHistory(client, { orderId, status, createdAt });
    await insertTrackingEvents(client, {
      orderId,
      status,
      createdAt,
      shippedAt,
      deliveredAt,
      cancelledAt,
      carrier,
      rng,
    });
    await insertPayment(client, {
      orderId,
      status: paymentStatus,
      method: paymentMethod,
      channel,
      total,
      createdAt,
      index,
    });
    await insertReturnIfNeeded(client, { orderId, userId: customer.id, status, index });
  }

  // Replay stock so inventory movements reconcile with the final stock.
  await insertInventoryMovements(client, productRows, saleEvents);

  await syncSequences(client);

  return summary;
}

// Build the exact product mix for one order.
function buildLineItems(rng, catalog, orderIndex) {
  const itemCount = intBetween(rng, 1, 3);
  const chosen = new Map();

  // Guarantee the out-of-stock and low-stock items get sales history.
  const forced = [];
  if (orderIndex % 3 === 0) forced.push(catalog[4]);
  if (orderIndex % 2 === 0) forced.push(catalog[6]);
  if (orderIndex % 4 === 0) forced.push(catalog[13]);

  for (const product of forced) {
    if (product) chosen.set(product, intBetween(rng, 1, 2));
  }

  while (chosen.size < itemCount) {
    const product = pick(rng, catalog);
    if (!chosen.has(product)) {
      chosen.set(product, intBetween(rng, 1, 3));
    }
  }

  return [...chosen.entries()].map(([product, quantity]) => ({
    productId: product.id,
    productTitle: product.title,
    productRef: product,
    unitPrice: product.price,
    quantity,
  }));
}

function resolvePaymentStatus(status, rng) {
  switch (status) {
    case "delivered":
      return rng() < 0.9 ? "paid" : "unpaid";
    case "shipped":
      return rng() < 0.6 ? "paid" : "unpaid";
    case "processing":
      return rng() < 0.5 ? "paid" : "unpaid";
    case "pending":
      return rng() < 0.2 ? "paid" : "unpaid";
    case "cancelled":
      return rng() < 0.4 ? "refunded" : "unpaid";
    case "return_requested":
      return "paid";
    case "returned":
      return "refunded";
    default:
      return "unpaid";
  }
}

async function insertStatusHistory(client, { orderId, status, createdAt }) {
  const chain = statusHistoryChain(status);
  let at = createdAt;
  let previous = null;

  for (const entry of chain) {
    await client.query(
      `INSERT INTO public.order_status_history
         (order_id, status, previous_status, admin_user_id, note, created_at)
       VALUES ($1,$2,$3,NULL,$4,$5)`,
      [orderId, entry.status, previous, entry.note, at]
    );

    previous = entry.status;
    at = addDays(at, 1);
  }
}

function statusHistoryChain(status) {
  switch (status) {
    case "processing":
      return [
        { status: "pending", note: "Order placed" },
        { status: "processing", note: "Payment/order confirmed" },
      ];
    case "shipped":
      return [
        { status: "pending", note: "Order placed" },
        { status: "processing", note: "Preparing for shipment" },
        { status: "shipped", note: "Handed to carrier" },
      ];
    case "delivered":
      return [
        { status: "pending", note: "Order placed" },
        { status: "processing", note: "Preparing for shipment" },
        { status: "shipped", note: "Handed to carrier" },
        { status: "delivered", note: "Delivered to customer" },
      ];
    case "cancelled":
      return [
        { status: "pending", note: "Order placed" },
        { status: "cancelled", note: "Cancelled before dispatch" },
      ];
    case "return_requested":
      return [
        { status: "pending", note: "Order placed" },
        { status: "shipped", note: "Handed to carrier" },
        { status: "delivered", note: "Delivered to customer" },
        { status: "return_requested", note: "Return requested by customer" },
      ];
    case "returned":
      return [
        { status: "pending", note: "Order placed" },
        { status: "shipped", note: "Handed to carrier" },
        { status: "delivered", note: "Delivered to customer" },
        { status: "return_requested", note: "Return requested by customer" },
        { status: "returned", note: "Return completed and refunded" },
      ];
    default:
      return [{ status, note: "Order placed" }];
  }
}

async function insertTrackingEvents(
  client,
  { orderId, status, createdAt, shippedAt, deliveredAt, cancelledAt, carrier, rng }
) {
  const events = [];

  if (status !== "cancelled") {
    events.push({
      status: "pending",
      message: "Order confirmed",
      location: "NovaShop Fulfilment Centre",
      at: createdAt,
    });
  }

  if (shippedAt) {
    events.push({
      status: "shipped",
      message: `Shipped with ${carrier}`,
      location: "Dhaka Sorting Hub",
      at: shippedAt,
    });
  }

  if (deliveredAt) {
    events.push({
      status: "shipped",
      message: "Out for delivery",
      location: "Local delivery station",
      at: addDays(deliveredAt, -1),
    });
    events.push({
      status: "delivered",
      message: "Delivered to customer",
      location: "Customer address",
      at: deliveredAt,
    });
  }

  if (cancelledAt) {
    events.push({
      status: "cancelled",
      message: "Order cancelled",
      location: "NovaShop",
      at: cancelledAt,
    });
  }

  if (status === "return_requested" || status === "returned") {
    events.push({
      status: "return_requested",
      message: "Return requested by customer",
      location: "Customer address",
      at: addDays(deliveredAt || createdAt, intBetween(rng, 3, 9)),
    });
  }

  if (status === "returned") {
    events.push({
      status: "returned",
      message: "Return completed and refunded",
      location: "NovaShop Returns",
      at: addDays(deliveredAt || createdAt, 12),
    });
  }

  for (const event of events) {
    await client.query(
      `INSERT INTO public.order_tracking_events
         (order_id, status, message, location, occurred_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$5)`,
      [orderId, event.status, event.message, event.location, event.at]
    );
  }
}

async function insertPayment(
  client,
  { orderId, status, method, channel, total, createdAt, index }
) {
  // A failed attempt recorded for a couple of online orders, for realism.
  if (method === "sslcommerz" && index % 11 === 5) {
    await client.query(
      `INSERT INTO public.payments (
         order_id, provider, channel, status, amount, currency,
         provider_tran_id, failure_reason, initiated_at, updated_at
       )
       VALUES ($1,'sslcommerz',$2,'failed',$3,$4,$5,
               'Gateway declined the transaction',$6,$6)`,
      [orderId, channel, total, env.currency, `DEMO-PAY-${index}-FAIL`, createdAt]
    );
  }

  const provider = method === "cod" ? "cod" : "sslcommerz";
  const state =
    status === "paid"
      ? "paid"
      : status === "refunded"
        ? "refunded"
        : status === "unpaid" && method === "cod"
          ? "pending"
          : null;

  if (!state) {
    return;
  }

  const paidAt = state === "paid" || state === "refunded" ? addDays(createdAt, 1) : null;
  const cardType = method === "sslcommerz" ? pick(createRng(index + 7), ["VISA", "MasterCard", "AMEX"]) : null;

  await client.query(
    `INSERT INTO public.payments (
       order_id, provider, channel, status, amount, currency, provider_tran_id,
       val_id, bank_tran_id, card_type, store_amount, initiated_at, paid_at, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      orderId,
      provider,
      method === "sslcommerz" ? channel : null,
      state,
      total,
      env.currency,
      `DEMO-PAY-${index}`,
      state === "paid" && method === "sslcommerz" ? `VAL-DEMO-${index}` : null,
      method === "sslcommerz" ? `BANK-DEMO-${index}` : null,
      cardType,
      method === "sslcommerz" ? money(total * 0.975) : null,
      createdAt,
      paidAt,
      paidAt || createdAt,
    ]
  );
}

async function insertReturnIfNeeded(client, { orderId, userId, status, index }) {
  let type = null;
  let returnStatus = null;

  if (status === "cancelled") {
    type = "cancellation";
    returnStatus = index === 28 ? "completed" : "approved";
  } else if (status === "return_requested") {
    type = "return";
    returnStatus = "requested";
  } else if (status === "returned") {
    type = "return";
    returnStatus = "completed";
  }

  if (!type) {
    return;
  }

  const reason =
    type === "cancellation"
      ? "Customer changed their mind before dispatch."
      : "Item did not match the description.";

  await client.query(
    `INSERT INTO public.order_returns
       (order_id, user_id, type, reason, status, admin_note, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE)`,
    [
      orderId,
      userId,
      type,
      reason,
      returnStatus,
      returnStatus === "completed"
        ? "Return received and refund issued."
        : returnStatus === "approved"
          ? "Approved and awaiting pickup."
          : null,
    ]
  );
}

async function insertInventoryMovements(client, products, saleEvents) {
  const eventsByProduct = new Map();

  for (const event of saleEvents) {
    const list = eventsByProduct.get(event.productRef) || [];
    list.push(event);
    eventsByProduct.set(event.productRef, list);
  }

  for (const product of products) {
    // Reconstruct history: initial stock minus every sale equals final stock.
    const initial = product.finalStock + product.sold;

    await client.query(
      `INSERT INTO public.inventory_movements
         (product_id, change, previous_stock, new_stock, reason, note, is_demo, created_at)
       VALUES ($1,$2,0,$2,'initial','Initial stock on product creation',TRUE,$3)`,
      [product.id, initial, product.createdAt]
    );

    const events = (eventsByProduct.get(product) || []).sort(
      (a, b) => a.at - b.at
    );

    let previous = initial;

    for (const event of events) {
      const next = previous - event.quantity;

      await client.query(
        `INSERT INTO public.inventory_movements
           (product_id, change, previous_stock, new_stock, reason, note, is_demo, created_at)
         VALUES ($1,$2,$3,$4,'sale','Sold via demo order',TRUE,$5)`,
        [product.id, -event.quantity, previous, next, event.at]
      );

      previous = next;
    }
  }
}

async function syncSequences(client) {
  const tables = [
    "users",
    "categories",
    "products",
    "orders",
    "order_items",
    "order_status_history",
    "order_tracking_events",
    "payments",
    "order_returns",
    "inventory_movements",
    "customer_addresses",
  ];

  for (const table of tables) {
    const sequence = (
      await client.query("SELECT pg_get_serial_sequence($1, 'id') AS name", [
        `public.${table}`,
      ])
    ).rows[0]?.name;

    if (!sequence) {
      continue;
    }

    const maxId = Number(
      (
        await client.query(
          `SELECT COALESCE(MAX(id), 0)::bigint AS value FROM public.${table}`
        )
      ).rows[0].value
    );

    const currentValue = Number(
      (await client.query(`SELECT last_value::bigint AS value FROM ${sequence}`))
        .rows[0].value
    );

    // Only ever advance a sequence. Never lower it: the store can place real
    // orders while the sandbox is being rebuilt, and resetting the counter
    // backwards would make their inserts collide on the primary key.
    if (maxId > currentValue) {
      await client.query("SELECT setval($1, $2, TRUE)", [sequence, maxId]);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function resetAndSeedDemo() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await resetDemoData(client);
    const summary = await seedDemoData(client);
    await client.query("COMMIT");
    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ensures the demo administrator exists and returns it. Used by the public
 * demo session endpoint so a recruiter can enter the sandbox without ever
 * handling a password.
 */
export async function ensureDemoAdmin() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const admin = await upsertDemoAdmin(client);
    await client.query("COMMIT");
    return admin;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function seedDemoIfEmpty() {
  const existing = await pool.query(
    "SELECT 1 FROM public.users WHERE is_demo = TRUE LIMIT 1"
  );

  if (existing.rowCount > 0) {
    return { seeded: false, reason: "Demo data already present" };
  }

  const summary = await resetAndSeedDemo();
  return { seeded: true, ...summary };
}

/** Removes every is_demo row (used by tests and maintenance tasks). */
export async function clearDemoData() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await resetDemoData(client, { keepAdmin: false });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function demoStatus() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM public.users WHERE is_demo = TRUE) AS demo_users,
      (SELECT COUNT(*)::int FROM public.products WHERE is_demo = TRUE) AS demo_products,
      (SELECT COUNT(*)::int FROM public.orders WHERE is_demo = TRUE) AS demo_orders
  `);

  return result.rows[0];
}
