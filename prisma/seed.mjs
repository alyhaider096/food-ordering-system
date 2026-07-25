import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/flavour_heaven";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const businessSeed = {
  name: "Flavour Heaven",
  slug: "flavour-heaven",
  legalName: "Flavour Heaven",
  supportPhone: "(051) 2751857",
  whatsappPhone: "0300-5055377",
  email: "hello@flavourheaven.pk",
  timezone: "Asia/Karachi",
  currency: "PKR",
};

const outletSeed = {
  name: "Flavour Heaven E-11",
  slug: "e-11-markaz",
  phone: "(051) 2751857",
  addressText: "Aksan Center Street #51, E-11/3 Markaz, Islamabad, Pakistan",
  latitude: 33.6995,
  longitude: 72.9651,
  openingHoursJson: {
    label: "Open 24/7",
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  },
};

const permissionDescriptions = {
  "orders:view": "View operational orders and order details.",
  "orders:update": "Move orders through allowed operational statuses.",
  "orders:cancel": "Cancel orders with a required reason.",
  "menu:edit": "Create and update menu categories, items, variants, modifiers, prices, and availability.",
  "reports:view": "View sales and operational reports.",
  "staff:manage": "Manage staff accounts, roles, sessions, and access.",
  "settings:edit": "Update business, outlet, delivery, and system settings.",
  "audit:view": "View audit logs and security events.",
  "riders:assign": "Assign delivery orders to riders.",
  "payments:record": "Record manual/cash payment collection.",
};

const rolePermissions = {
  OWNER: [
    "orders:view",
    "orders:update",
    "orders:cancel",
    "menu:edit",
    "reports:view",
    "staff:manage",
    "settings:edit",
    "audit:view",
    "riders:assign",
    "payments:record",
  ],
  SYSTEM_ADMIN: [
    "orders:view",
    "orders:update",
    "orders:cancel",
    "menu:edit",
    "reports:view",
    "staff:manage",
    "settings:edit",
    "audit:view",
    "riders:assign",
    "payments:record",
  ],
  MANAGER: [
    "orders:view",
    "orders:update",
    "orders:cancel",
    "menu:edit",
    "reports:view",
    "settings:edit",
    "riders:assign",
    "payments:record",
  ],
  CASHIER: ["orders:view", "orders:update", "riders:assign", "payments:record"],
  KITCHEN: ["orders:view", "orders:update"],
  RIDER: ["orders:view", "orders:update"],
  MENU_EDITOR: ["menu:edit"],
  SUPPORT: ["orders:view"],
};

const categories = [
  { name: "Popular", slug: "popular", description: "The items customers come back for.", displayOrder: 0 },
  { name: "Pizza", slug: "pizza", description: "Crown crusts, stuffed crusts, and Heaven specials.", displayOrder: 1 },
  { name: "Burgers", slug: "burgers", description: "Crispy zingers and loaded chicken burgers.", displayOrder: 2 },
  { name: "Shawarma", slug: "shawarma", description: "Fresh wraps, cheese shawarma, and platters.", displayOrder: 3 },
  { name: "Starters", slug: "starters", description: "Rolls, sticks, chunks, wings, and nuggets.", displayOrder: 4 },
  { name: "Platters", slug: "platters", description: "Big plates built for sharing.", displayOrder: 5 },
  { name: "Fries & Sides", slug: "fries", description: "Loaded fries, regular fries, and fried chicken.", displayOrder: 6 },
  { name: "Drinks", slug: "drinks", description: "Cold soft drinks for every order.", displayOrder: 7 },
];

const addOns = [
  { slug: "mayo-sauce", name: "Mayo sauce", pricePkr: 70 },
  { slug: "small-extra-topping", name: "Small extra topping", pricePkr: 100 },
  { slug: "medium-extra-topping", name: "Medium extra topping", pricePkr: 120 },
  { slug: "large-extra-topping", name: "Large extra topping", pricePkr: 180 },
  { slug: "extra-cheese", name: "Extra cheese", pricePkr: 90 },
  { slug: "extra-sauce", name: "Extra sauce", pricePkr: 50 },
  { slug: "extra-patty", name: "Extra patty", pricePkr: 220 },
  { slug: "extra-dip", name: "Extra dip", pricePkr: 50 },
  { slug: "extra-fries", name: "Extra fries", pricePkr: 120 },
  { slug: "extra-cheese-sauce", name: "Extra cheese sauce", pricePkr: 90 },
];

const pizzaAddOns = ["mayo-sauce", "small-extra-topping", "medium-extra-topping", "large-extra-topping"];
const burgerAddOns = ["extra-cheese", "extra-sauce", "extra-patty"];
const sideAddOns = ["extra-dip", "extra-fries", "extra-cheese-sauce"];

const menuItems = [
  {
    categorySlug: "pizza",
    name: "Heaven Crown Crust Pizza",
    slug: "heaven-crown-crust-pizza",
    description:
      "Crown crust pizza loaded with chicken tikka, fajita, liver, tandoori, supreme, mushroom, and house sauces. From 9 inch.",
    basePricePkr: 1300,
    imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=900&q=82",
    tags: ["Crown crust", "Pizza"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 1,
    addOnSlugs: pizzaAddOns,
    variants: [
      { name: '9"', pricePkr: 1300, isDefault: true, displayOrder: 1 },
      { name: '12"', pricePkr: 1700, displayOrder: 2 },
      { name: '15"', pricePkr: 2650, displayOrder: 3 },
    ],
  },
  {
    categorySlug: "pizza",
    name: "Heaven Stuff Crust Pizza",
    slug: "heaven-stuff-crust-pizza",
    description: "Stuffed crust pizza with melted cheese edges and your choice of signature chicken flavours. From 9 inch.",
    basePricePkr: 1300,
    imageUrl: "https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&w=900&q=82",
    tags: ["Stuff crust"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 2,
    addOnSlugs: pizzaAddOns,
  },
  {
    categorySlug: "pizza",
    name: "Heaven Treat Pizza",
    slug: "heaven-treat-pizza",
    description: "Cheezy tikka, Heaven special, chicken extreme, and behari kabab flavours baked hot.",
    basePricePkr: 1300,
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82",
    tags: ["Family favourite"],
    sortOrder: 3,
    addOnSlugs: pizzaAddOns,
  },
  {
    categorySlug: "pizza",
    name: "Heaven Scooper",
    slug: "heaven-scooper",
    description: "Small scooper pizza made for quick cravings, available from 6 inch up to party size.",
    basePricePkr: 500,
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=82",
    tags: ["Quick bite"],
    sortOrder: 4,
    addOnSlugs: pizzaAddOns,
  },
  {
    categorySlug: "pizza",
    name: "Crunchy Chicken Pasta",
    slug: "crunchy-chicken-pasta",
    description: "Macaroni pasta in white sauce topped with crispy chicken and cheese.",
    basePricePkr: 800,
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=82",
    tags: ["Pasta"],
    sortOrder: 5,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "burgers",
    name: "Zinger Burger",
    slug: "zinger-burger",
    description: "Crunchy chicken fillet, lettuce, mayo, and a soft toasted bun.",
    basePricePkr: 430,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=82",
    tags: ["Crispy"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 10,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "burgers",
    name: "Zinger Supreme",
    slug: "zinger-supreme",
    description: "A richer zinger build with extra sauce, cheese, and a bigger crunch.",
    basePricePkr: 650,
    imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=900&q=82",
    tags: ["Supreme"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 11,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "burgers",
    name: "Tower Burger",
    slug: "tower-burger",
    description: "Tall, saucy, and stacked with crispy chicken for a proper meal.",
    basePricePkr: 600,
    imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=82",
    tags: ["Loaded"],
    sortOrder: 12,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "burgers",
    name: "Chicken Burger",
    slug: "chicken-burger",
    description: "Simple, fresh chicken burger with sauce and salad for everyday cravings.",
    basePricePkr: 280,
    imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=82",
    tags: ["Classic"],
    sortOrder: 13,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "shawarma",
    name: "Chicken Shawarma",
    slug: "chicken-shawarma",
    description: "Fresh chicken, garlic sauce, salad, and soft wrap toasted on order.",
    basePricePkr: 200,
    imageUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=82",
    tags: ["Value"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 20,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "shawarma",
    name: "Chicken Cheese Shawarma",
    slug: "chicken-cheese-shawarma",
    description: "Classic shawarma upgraded with creamy cheese and extra house sauce.",
    basePricePkr: 270,
    imageUrl: "https://images.unsplash.com/photo-1662116765994-1e4200c43589?auto=format&fit=crop&w=900&q=82",
    tags: ["Cheesy"],
    sortOrder: 21,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "shawarma",
    name: "Zinger Shawarma",
    slug: "zinger-shawarma",
    description: "Crispy zinger strips wrapped with sauce, salad, and a toasted finish.",
    basePricePkr: 400,
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=82",
    tags: ["Crispy"],
    sortOrder: 22,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "shawarma",
    name: "Heaven Special Shawarma",
    slug: "heaven-special-shawarma",
    description: "A bigger, saucier house shawarma made with the Flavour Heaven mix.",
    basePricePkr: 350,
    imageUrl: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=82",
    tags: ["House special"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 23,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "shawarma",
    name: "Platter Shawarma",
    slug: "platter-shawarma",
    description: "Shawarma served open with fries, sauces, and a filling plate portion.",
    basePricePkr: 500,
    imageUrl: "https://images.unsplash.com/photo-1644364935906-792b2245a2c0?auto=format&fit=crop&w=900&q=82",
    tags: ["Platter"],
    sortOrder: 24,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "starters",
    name: "Heaven Rolls",
    slug: "heaven-rolls",
    description: "Four rolls stuffed with yummy sauces and savoury fillings.",
    basePricePkr: 600,
    imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=82",
    tags: ["4 pcs"],
    sortOrder: 30,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "starters",
    name: "Heaven Sticks",
    slug: "heaven-sticks",
    description: "Fresh baked bread sticks filled with the yummiest cheese blend.",
    basePricePkr: 500,
    imageUrl: "https://images.unsplash.com/photo-1619535860434-cf9b8045f4bb?auto=format&fit=crop&w=900&q=82",
    tags: ["Cheese"],
    sortOrder: 31,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "starters",
    name: "Calzone Chunks",
    slug: "calzone-chunks",
    description: "Four stuffed calzone chunks served with sauce and fries.",
    basePricePkr: 950,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=82",
    tags: ["4 pcs"],
    sortOrder: 32,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "starters",
    name: "Chicken Nuggets",
    slug: "chicken-nuggets",
    description: "Crispy nuggets served hot. Start with 5 pieces or make it 10.",
    basePricePkr: 350,
    imageUrl: "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=82",
    tags: ["5 pcs"],
    sortOrder: 33,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "starters",
    name: "Oven Baked Wings",
    slug: "oven-baked-wings",
    description: "Fresh oven baked wings served with dip sauce. From 6 pieces.",
    basePricePkr: 450,
    imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=82",
    tags: ["Wings"],
    sortOrder: 34,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "starters",
    name: "Flaming Wings",
    slug: "flaming-wings",
    description: "Fresh oven baked wings tossed in hot peri peri sauce and served with dip.",
    basePricePkr: 500,
    imageUrl: "https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=900&q=82",
    tags: ["Spicy"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 35,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "platters",
    name: "Special Roasted Platter",
    slug: "special-roasted-platter",
    description: "Behari spin rolls, wings, fries, and dip sauce built for sharing.",
    basePricePkr: 1000,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=82",
    tags: ["Shareable"],
    sortOrder: 40,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "platters",
    name: "Classic Roll Platter",
    slug: "classic-roll-platter",
    description: "Behari rolls and Arabic rolls served with fries and sauce.",
    basePricePkr: 1000,
    imageUrl: "https://images.unsplash.com/photo-1515669097368-22e68427d265?auto=format&fit=crop&w=900&q=82",
    tags: ["Classic"],
    sortOrder: 41,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "platters",
    name: "Heaven Sandwich",
    slug: "heaven-sandwich",
    description: "Two flavour sandwich with Euro and Mexican notes, grilled and saucy.",
    basePricePkr: 800,
    imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=82",
    tags: ["Two flavours"],
    sortOrder: 42,
    addOnSlugs: burgerAddOns,
  },
  {
    categorySlug: "platters",
    name: "Pizza Stacker",
    slug: "pizza-stacker",
    description: "A stacked, cheesy pizza sandwich style build for heavy cravings.",
    basePricePkr: 800,
    imageUrl: "https://images.unsplash.com/photo-1613564834361-9436948817d1?auto=format&fit=crop&w=900&q=82",
    tags: ["Stacked"],
    sortOrder: 43,
    addOnSlugs: pizzaAddOns,
  },
  {
    categorySlug: "fries",
    name: "Fried Chicken",
    slug: "fried-chicken",
    description: "Crispy fried chicken, available as one choice piece or a 3 piece meal.",
    basePricePkr: 270,
    imageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=900&q=82",
    tags: ["Crispy"],
    sortOrder: 50,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "fries",
    name: "Hot Wings",
    slug: "hot-wings",
    description: "Classic hot wings with a spicy kick. From 6 pieces.",
    basePricePkr: 400,
    imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=900&q=82",
    tags: ["Hot"],
    sortOrder: 51,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "fries",
    name: "Loaded Fries",
    slug: "loaded-fries",
    description: "Fries loaded with sauces, cheese, and flavourful toppings.",
    basePricePkr: 750,
    imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=900&q=82",
    tags: ["Loaded"],
    isFeatured: true,
    isPopular: true,
    sortOrder: 52,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "fries",
    name: "Regular Fries",
    slug: "regular-fries",
    description: "Crispy fries, salted and served fresh. Regular and large options available.",
    basePricePkr: 200,
    imageUrl: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=900&q=82",
    tags: ["Side"],
    sortOrder: 53,
    addOnSlugs: sideAddOns,
  },
  {
    categorySlug: "drinks",
    name: "Soft Drink",
    slug: "soft-drink",
    description: "Chilled soft drink. Regular, 500ml, 1 litre, and 1.5 litre sizes available.",
    basePricePkr: 100,
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=82",
    tags: ["Cold"],
    sortOrder: 60,
    addOnSlugs: [],
  },
];

const deliveryZones = [
  { name: "E-11/3 Markaz", areaLabel: "E-11/3 Markaz", sectorCode: "E-11/3", feePkr: 0, estimatedMinutes: 30 },
  { name: "E-11/2", areaLabel: "E-11/2", sectorCode: "E-11/2", feePkr: 0, estimatedMinutes: 35 },
  { name: "E-11/1", areaLabel: "E-11/1", sectorCode: "E-11/1", feePkr: 0, estimatedMinutes: 35 },
  { name: "E-11/4", areaLabel: "E-11/4", sectorCode: "E-11/4", feePkr: 0, estimatedMinutes: 35 },
  { name: "F-11", areaLabel: "F-11", sectorCode: "F-11", feePkr: 180, estimatedMinutes: 40, minimumOrderPkr: 500 },
  { name: "G-11", areaLabel: "G-11", sectorCode: "G-11", feePkr: 180, estimatedMinutes: 40, minimumOrderPkr: 500 },
  { name: "D-12", areaLabel: "D-12", sectorCode: "D-12", feePkr: 220, estimatedMinutes: 45, minimumOrderPkr: 700 },
];

const staffUsers = [
  { name: "Demo Owner", email: "owner@flavourheaven.local", role: "OWNER" },
  { name: "Demo Manager", email: "manager@flavourheaven.local", role: "MANAGER" },
  { name: "Demo Cashier", email: "cashier@flavourheaven.local", role: "CASHIER" },
  { name: "Demo Kitchen", email: "kitchen@flavourheaven.local", role: "KITCHEN" },
  { name: "Demo Rider", email: "rider@flavourheaven.local", role: "RIDER" },
  { name: "Demo Menu Editor", email: "menu@flavourheaven.local", role: "MENU_EDITOR" },
];

async function main() {
  const passwordHash = await bcrypt.hash("Flavour123!", 12);

  const business = await prisma.business.upsert({
    create: businessSeed,
    update: businessSeed,
    where: { slug: businessSeed.slug },
  });

  const outlet = await prisma.outlet.upsert({
    create: { ...outletSeed, businessId: business.id },
    update: outletSeed,
    where: { slug: outletSeed.slug },
  });

  const rolesByCode = new Map();
  for (const roleCode of Object.keys(rolePermissions)) {
    const role = await prisma.role.upsert({
      create: {
        code: roleCode,
        description: `${roleCode.replaceAll("_", " ").toLowerCase()} access`,
        name: roleCode.replaceAll("_", " "),
      },
      update: {
        description: `${roleCode.replaceAll("_", " ").toLowerCase()} access`,
        name: roleCode.replaceAll("_", " "),
      },
      where: { code: roleCode },
    });
    rolesByCode.set(roleCode, role);
  }

  const permissionsByCode = new Map();
  for (const [code, description] of Object.entries(permissionDescriptions)) {
    const permission = await prisma.permission.upsert({
      create: { code, description },
      update: { description },
      where: { code },
    });
    permissionsByCode.set(code, permission);
  }

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
    const role = rolesByCode.get(roleCode);
    for (const permissionCode of permissionCodes) {
      const permission = permissionsByCode.get(permissionCode);
      await prisma.rolePermission.upsert({
        create: { permissionId: permission.id, roleId: role.id },
        update: {},
        where: {
          roleId_permissionId: {
            permissionId: permission.id,
            roleId: role.id,
          },
        },
      });
    }
  }

  const categoryBySlug = new Map();
  for (const category of categories) {
    const dbCategory = await prisma.category.upsert({
      create: { ...category, businessId: business.id },
      update: category,
      where: { slug: category.slug },
    });
    categoryBySlug.set(category.slug, dbCategory);
  }

  const existingModifierGroup = await prisma.modifierGroup.findFirst({
    where: { businessId: business.id, name: "Add Ons" },
  });
  const defaultModifierGroup = existingModifierGroup
    ? await prisma.modifierGroup.update({
        data: {
          displayOrder: 1,
          maxSelect: 10,
          minSelect: 0,
          name: "Add Ons",
          selectionType: "MULTIPLE",
        },
        where: { id: existingModifierGroup.id },
      })
    : await prisma.modifierGroup.create({
        data: {
          businessId: business.id,
          displayOrder: 1,
          maxSelect: 10,
          minSelect: 0,
          name: "Add Ons",
          selectionType: "MULTIPLE",
        },
      });

  const addOnBySlug = new Map();
  for (const addOn of addOns) {
    const dbAddOn = await prisma.addOn.upsert({
      create: {
        ...addOn,
        businessId: business.id,
        modifierGroupId: defaultModifierGroup.id,
      },
      update: {
        name: addOn.name,
        pricePkr: addOn.pricePkr,
        isActive: true,
      },
      where: { slug: addOn.slug },
    });
    addOnBySlug.set(addOn.slug, dbAddOn);
  }

  for (const menuItem of menuItems) {
    const { addOnSlugs, categorySlug, variants = [], ...data } = menuItem;
    const category = categoryBySlug.get(categorySlug);
    if (!category) throw new Error(`Missing category ${categorySlug}`);

    const dbMenuItem = await prisma.menuItem.upsert({
      create: {
        ...data,
        businessId: business.id,
        categoryId: category.id,
      },
      update: {
        ...data,
        businessId: business.id,
        categoryId: category.id,
      },
      where: { slug: menuItem.slug },
    });

    await prisma.menuItemModifierGroup.upsert({
      create: {
        displayOrder: 1,
        menuItemId: dbMenuItem.id,
        modifierGroupId: defaultModifierGroup.id,
      },
      update: { displayOrder: 1 },
      where: {
        menuItemId_modifierGroupId: {
          menuItemId: dbMenuItem.id,
          modifierGroupId: defaultModifierGroup.id,
        },
      },
    });

    for (const addOnSlug of addOnSlugs) {
      const addOn = addOnBySlug.get(addOnSlug);
      if (!addOn) throw new Error(`Missing add-on ${addOnSlug}`);
      await prisma.menuItemAddOn.upsert({
        create: { addOnId: addOn.id, menuItemId: dbMenuItem.id },
        update: {},
        where: { menuItemId_addOnId: { addOnId: addOn.id, menuItemId: dbMenuItem.id } },
      });
    }

    for (const variant of variants) {
      const existingVariant = await prisma.itemVariant.findFirst({
        select: { id: true },
        where: { menuItemId: dbMenuItem.id, name: variant.name },
      });
      if (existingVariant) {
        await prisma.itemVariant.update({
          data: variant,
          where: { id: existingVariant.id },
        });
      } else {
        await prisma.itemVariant.create({
          data: { ...variant, menuItemId: dbMenuItem.id },
        });
      }
    }
  }

  for (const zone of deliveryZones) {
    await prisma.deliveryZone.upsert({
      create: { ...zone, outletId: outlet.id },
      update: zone,
      where: { outletId_sectorCode: { outletId: outlet.id, sectorCode: zone.sectorCode } },
    });
  }

  for (const staffUser of staffUsers) {
    const createdStaff = await prisma.staffUser.upsert({
      create: {
        ...staffUser,
        businessId: business.id,
        passwordHash,
      },
      update: {
        businessId: business.id,
        isActive: true,
        name: staffUser.name,
        role: staffUser.role,
      },
      where: { email: staffUser.email },
    });

    const role = rolesByCode.get(staffUser.role);
    await prisma.staffUserRole.upsert({
      create: {
        outletId: outlet.id,
        roleId: role.id,
        staffUserId: createdStaff.id,
      },
      update: {},
      where: {
        staffUserId_roleId_outletId: {
          outletId: outlet.id,
          roleId: role.id,
          staffUserId: createdStaff.id,
        },
      },
    });
  }

  const heroAssetUrl =
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=84";
  const existingHeroAsset = await prisma.mediaAsset.findFirst({
    where: { businessId: business.id, publicUrl: heroAssetUrl },
  });
  const heroAsset = existingHeroAsset
    ? await prisma.mediaAsset.update({
        data: {
          altText: "Flavour Heaven yellow launch banner with pizza and fast food.",
          provider: "remote",
          publicUrl: heroAssetUrl,
        },
        where: { id: existingHeroAsset.id },
      })
    : await prisma.mediaAsset.create({
        data: {
          altText: "Flavour Heaven yellow launch banner with pizza and fast food.",
          businessId: business.id,
          provider: "remote",
          publicUrl: heroAssetUrl,
        },
      });

  const bannerData = {
    businessId: business.id,
    displayOrder: 1,
    mediaAssetId: heroAsset.id,
    outletId: outlet.id,
    subtitle: "Fresh pizza, burgers, shawarma, and sides from E-11 Markaz.",
    targetType: "CATEGORY",
    targetId: categoryBySlug.get("pizza")?.id,
    title: "Fresh From Heaven",
  };
  const existingBanner = await prisma.homepageBanner.findFirst({
    where: { businessId: business.id, outletId: outlet.id, title: bannerData.title },
  });
  if (existingBanner) {
    await prisma.homepageBanner.update({
      data: bannerData,
      where: { id: existingBanner.id },
    });
  } else {
    await prisma.homepageBanner.create({
      data: bannerData,
    });
  }

  const promotionData = {
    businessId: business.id,
    discountType: "FREE_DELIVERY",
    discountValue: 0,
    minSubtotalPkr: 0,
    title: "Free Delivery in E-11",
  };
  const existingPromotion = await prisma.promotion.findFirst({
    where: { businessId: business.id, title: promotionData.title },
  });
  if (existingPromotion) {
    await prisma.promotion.update({
      data: promotionData,
      where: { id: existingPromotion.id },
    });
  } else {
    await prisma.promotion.create({
      data: promotionData,
    });
  }

  await prisma.notificationTemplate.upsert({
    create: {
      bodyPreview: "Hi {{name}}, your Flavour Heaven order {{reference}} is confirmed.",
      businessId: business.id,
      channel: "WHATSAPP",
      language: "en",
      templateCode: "order_confirmed_v1",
    },
    update: {
      bodyPreview: "Hi {{name}}, your Flavour Heaven order {{reference}} is confirmed.",
      isActive: true,
    },
    where: {
      businessId_channel_templateCode_language: {
        businessId: business.id,
        channel: "WHATSAPP",
        language: "en",
        templateCode: "order_confirmed_v1",
      },
    },
  });

  await prisma.businessSetting.upsert({
    create: {
      businessId: business.id,
      key: "restaurant_profile",
      outletId: outlet.id,
      valueJson: {
        address: outletSeed.addressText,
        name: businessSeed.name,
        phone: [businessSeed.supportPhone, businessSeed.whatsappPhone],
        status: "Open 24/7",
      },
    },
    update: {
      businessId: business.id,
      outletId: outlet.id,
      valueJson: {
        address: outletSeed.addressText,
        name: businessSeed.name,
        phone: [businessSeed.supportPhone, businessSeed.whatsappPhone],
        status: "Open 24/7",
      },
    },
    where: { key: "restaurant_profile" },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
