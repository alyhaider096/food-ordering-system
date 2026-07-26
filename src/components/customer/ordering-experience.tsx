"use client";

import {
  Bike,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  Gift,
  Loader2,
  LocateFixed,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { cartQuantity, cartSubtotal, formatPrice, lineTotal } from "@/lib/cart";
import {
  normalizePakistanMobileNumber,
  PAKISTAN_MOBILE_ERROR,
  toWhatsAppPhoneNumber,
} from "@/lib/pakistan-phone";
import type {
  AddOn,
  CartLine,
  DeliveryArea,
  DeliveryLocation,
  MenuItem,
  OrderType,
  OrderTypeOption,
  PublicMenu,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const shopPhone = "0300-5055377";
const branchAddress = "Aksan Center, E-11/3 Markaz, Islamabad";
const branchDirectionsUrl = "https://maps.google.com/?q=Aksan%20Center%20E-11%2F3%20Markaz%20Islamabad";

const orderTypeOptions: OrderTypeOption[] = [
  { id: "delivery", label: "Delivery", description: "Hot food to your door", icon: Bike },
  { id: "pickup", label: "Pick-Up", description: "Ready at the counter", icon: Store },
  { id: "carhop", label: "Car-Hop", description: "Served to your car", icon: CarFront },
];

const bannerSlides = [
  {
    kicker: "Eat great food",
    title: "Pizza, burgers, shawarma, wings, and loaded sides made fresh in E-11.",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=82",
  },
  {
    kicker: "Free E-11 delivery",
    title: "Order for home, pick it up, or let us bring it to your car.",
    image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=1400&q=82",
  },
];

function deliveryFeeLabel(fee: number) {
  return fee === 0 ? "Free" : formatPrice(fee);
}

const floatingWhatsappUrl = `https://wa.me/${toWhatsAppPhoneNumber(shopPhone) ?? "923005055377"}?text=${encodeURIComponent(
  "Hi Flavour Heaven, I want to place an order.",
)}`;

const POPULAR_TAB_ID = "popular";
const popularTabCategory = {
  id: POPULAR_TAB_ID,
  name: "Popular",
  description: "The items customers come back for.",
};

// Keep the client cap in sync with the server order schema (quantity.max(20)).
const MAX_ITEM_QUANTITY = 20;
const CART_STORAGE_KEY = "flavour-heaven-cart-v1";

type LocationStatus = "idle" | "loading" | "ready" | "error" | "unsupported";

// Shared modal behaviour: lock background scroll while open and close on Escape
// (when dismissable). onClose is read through a ref so a changing handler identity
// does not thrash the scroll lock.
function useModalA11y(open: boolean, canDismiss: boolean, onClose?: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canDismiss) closeRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, canDismiss]);
}

function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] shadow-lift",
        className,
      )}
    >
      <svg aria-hidden="true" className="h-[78%] w-[78%]" viewBox="0 0 96 96">
        <path d="M48 15v11" stroke="#161616" strokeLinecap="round" strokeWidth="4" />
        <path
          d="M32 30c0-6 8-10 16-10s16 4 16 10v18c0 12-7 22-16 29-9-7-16-17-16-29V30Z"
          fill="#161616"
        />
        <path d="M37 34h22M35 44h26M37 54h22" stroke="#ffdd00" strokeLinecap="round" strokeWidth="4" />
        <path d="M16 70c7-8 19-10 29-4l-8 10c-7-3-15-2-21 3v-9Z" fill="#161616" />
        <path d="M53 66c10-6 22-4 29 4v9c-6-5-14-6-22-3l-7-10Z" fill="#161616" />
        <path d="M19 82h58" stroke="#161616" strokeLinecap="round" strokeWidth="4" />
      </svg>
      {!compact ? <span className="sr-only">Flavour Heaven</span> : null}
    </div>
  );
}

export function OrderingExperience({ initialMenu }: { initialMenu: PublicMenu }) {
  const { categories, deliveryAreas, items: menuItems } = initialMenu;
  const defaultAreaId = deliveryAreas[0]?.id ?? "";
  const popularItems = menuItems.filter((item) => item.isPopular).slice(0, 6);
  const categoriesWithItems = categories.filter((category) =>
    menuItems.some((item) => item.categoryId === category.id),
  );
  const tabCategories = popularItems.length
    ? [popularTabCategory, ...categoriesWithItems]
    : categoriesWithItems;
  const defaultCategoryId = tabCategories[0]?.id ?? "";

  const [hasSelectedOrderSetup, setHasSelectedOrderSetup] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [selectedArea, setSelectedArea] = useState(defaultAreaId);
  const [activeCategory, setActiveCategory] = useState(defaultCategoryId);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [cartHydrated, setCartHydrated] = useState(false);
  const menuSectionRef = useRef<HTMLElement | null>(null);

  const area = deliveryAreas.find((item) => item.id === selectedArea) ?? deliveryAreas[0];
  const subtotal = cartSubtotal(cart);
  const deliveryFee = orderType === "delivery" ? area?.fee ?? 0 : 0;
  const total = subtotal + deliveryFee;
  const qty = cartQuantity(cart);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory = normalized.length > 0
        ? true
        : activeCategory === POPULAR_TAB_ID
          ? item.isPopular
          : item.categoryId === activeCategory;
      const matchesQuery =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized) ||
        item.tags.some((tag) => tag.toLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, menuItems, query]);

  useEffect(() => {
    setHasSelectedOrderSetup(false);
    setSetupOpen(true);
  }, []);

  // Restore a saved cart so refreshing mid-order does not wipe it. We reconcile
  // each saved line against the current menu and drop anything no longer offered.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const savedLines = JSON.parse(stored) as CartLine[];
        const restored = savedLines
          .map((line) => {
            const currentItem = menuItems.find((item) => item.id === line.item?.id);
            if (!currentItem) return null;
            const addOns = (line.addOns ?? [])
              .map((addOn) => currentItem.addOns.find((candidate) => candidate.id === addOn.id))
              .filter((addOn): addOn is AddOn => Boolean(addOn));
            return {
              ...line,
              addOns,
              item: currentItem,
              quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, line.quantity)),
            } satisfies CartLine;
          })
          .filter((line): line is CartLine => line !== null);
        if (restored.length) setCart(restored);
      }
    } catch {
      // A corrupt cart cache should never block ordering.
    }
    setCartHydrated(true);
  }, [menuItems]);

  // Persist the cart on every change, but only after the initial restore runs so
  // we never overwrite a saved cart with the empty first-render state.
  useEffect(() => {
    if (!cartHydrated) return;
    try {
      if (cart.length) {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } else {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch {
      // Ignore storage write failures (private mode, quota exceeded).
    }
  }, [cart, cartHydrated]);

  function scrollToMenu() {
    window.requestAnimationFrame(() => {
      menuSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleCategoryChange(categoryId: string) {
    setActiveCategory(categoryId);
    setQuery("");
    scrollToMenu();
  }

  function openItem(item: MenuItem) {
    setSelectedItem(item);
    setSelectedAddOns([]);
    setSelectedItemQuantity(1);
  }

  function toggleAddOn(addOn: AddOn) {
    setSelectedAddOns((current) =>
      current.some((item) => item.id === addOn.id)
        ? current.filter((item) => item.id !== addOn.id)
        : [...current, addOn],
    );
  }

  function addItemToCart(item: MenuItem, addOns: AddOn[], quantity: number) {
    const addOnKey = addOns.map((addOn) => addOn.id).sort().join("-");
    const lineId = `${item.id}:${addOnKey || "base"}`;

    setCart((current) => {
      const existing = current.find((line) => line.id === lineId);
      if (existing) {
        return current.map((line) =>
          line.id === lineId
            ? { ...line, quantity: Math.min(MAX_ITEM_QUANTITY, line.quantity + quantity) }
            : line,
        );
      }

      return [
        ...current,
        { addOns, id: lineId, item, quantity: Math.min(MAX_ITEM_QUANTITY, quantity) },
      ];
    });
  }

  function addSelectedItem() {
    if (!selectedItem) return;
    addItemToCart(selectedItem, selectedAddOns, selectedItemQuantity);
    setSelectedItem(null);
    setSelectedAddOns([]);
    setSelectedItemQuantity(1);
    setCartOpen(true);
  }

  function updateQuantity(lineId: string, nextQuantity: number) {
    setCart((current) =>
      nextQuantity <= 0
        ? current.filter((line) => line.id !== lineId)
        : current.map((line) =>
            line.id === lineId
              ? { ...line, quantity: Math.min(MAX_ITEM_QUANTITY, nextQuantity) }
              : line,
          ),
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      setLocationMessage("GPS is not available in this browser. You can still type the address.");
      return;
    }

    setLocationStatus("loading");
    setLocationMessage("Getting your GPS pin...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          accuracyMeters: Math.round(position.coords.accuracy),
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        };
        setDeliveryLocation(nextLocation);
        setLocationStatus("ready");
        setLocationMessage(`GPS pinned within about ${nextLocation.accuracyMeters} meters.`);
      },
      () => {
        setDeliveryLocation(null);
        setLocationStatus("error");
        setLocationMessage("GPS permission was not granted. Please type the full address.");
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  function confirmOrderSetup() {
    setHasSelectedOrderSetup(true);
    setSetupOpen(false);
  }

  function startAnotherOrder() {
    setCart([]);
    setCartOpen(false);
    setHasSelectedOrderSetup(false);
    setSetupOpen(true);
    setDeliveryLocation(null);
    setLocationStatus("idle");
    setLocationMessage("");
  }

  return (
    <main className="animate-page-in min-h-screen bg-[#fff9dc] text-[#161616]">
      <Header
        cartQuantity={qty}
        onCartOpen={() => setCartOpen(true)}
        onSearchSubmit={scrollToMenu}
        onSetupOpen={() => setSetupOpen(true)}
        orderType={orderType}
        query={query}
        selectedArea={area}
        setQuery={setQuery}
      />

      <OrderSetupModal
        deliveryAreas={deliveryAreas}
        hasLocation={Boolean(deliveryLocation)}
        locationMessage={locationMessage}
        locationStatus={locationStatus}
        onConfirm={confirmOrderSetup}
        onOrderTypeChange={setOrderType}
        onRequestLocation={requestLocation}
        onSelectedAreaChange={setSelectedArea}
        open={setupOpen}
        orderType={orderType}
        selectedArea={selectedArea}
        showClose={hasSelectedOrderSetup}
      />

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-4">
        <HeroBanners />
        <CategoryTabs
          activeCategory={activeCategory}
          categories={tabCategories}
          onChange={handleCategoryChange}
        />
        <PromoCard />

        <section className="mt-8 scroll-mt-32" id="menu" ref={menuSectionRef}>
          <CategoryBanner
            activeCategory={activeCategory}
            categories={tabCategories}
            isSearching={Boolean(query.trim())}
            query={query}
            resultCount={visibleItems.length}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <MenuItemCard item={item} key={item.id} onOpen={openItem} />
            ))}
          </div>
          {!visibleItems.length ? (
            <div className="mt-8 rounded-[22px] border-2 border-dashed border-transparent bg-white p-8 text-center">
              <p className="font-extrabold text-[#161616]">No matching items yet.</p>
              <p className="mt-2 text-sm font-bold text-[#5f5f5f]">
                Try pizza, zinger, shawarma, wings, or another category.
              </p>
            </div>
          ) : null}
        </section>
      </section>

      <Footer />
      <FloatingWhatsApp raised={Boolean(qty)} />

      {qty ? (
        <button
          className="action-button hover-lift icon-bounce animate-soft-pulse focus-ring fixed bottom-5 left-1/2 z-30 inline-flex w-[min(420px,calc(100%-32px))] -translate-x-1/2 items-center justify-between rounded-[22px] border-2 border-transparent bg-[#ffdd00] px-5 py-4 font-extrabold text-[#161616] shadow-[0_18px_45px_rgba(22,22,22,0.25)]"
          data-testid="floating-cart-button"
          onClick={() => setCartOpen(true)}
          type="button"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-transparent bg-white text-[#161616]">
            {qty}
          </span>
          <span>View Cart</span>
          <span>{formatPrice(total)}</span>
          <ChevronRight size={20} />
        </button>
      ) : null}

      <CartDrawer
        areaId={area?.id ?? ""}
        areaLabel={area?.label ?? "selected area"}
        cart={cart}
        clearCart={() => setCart([])}
        deliveryFee={deliveryFee}
        deliveryLocation={deliveryLocation}
        locationMessage={locationMessage}
        locationStatus={locationStatus}
        onClose={() => setCartOpen(false)}
        onQuickAdd={(item) => addItemToCart(item, [], 1)}
        onRequestLocation={requestLocation}
        open={cartOpen}
        orderType={orderType}
        onStartAnotherOrder={startAnotherOrder}
        popularItems={popularItems}
        total={total}
        updateQuantity={updateQuantity}
      />

      {selectedItem ? (
        <ItemModal
          addSelectedItem={addSelectedItem}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          quantity={selectedItemQuantity}
          selectedAddOns={selectedAddOns}
          setQuantity={setSelectedItemQuantity}
          toggleAddOn={toggleAddOn}
        />
      ) : null}
    </main>
  );
}

function Header({
  cartQuantity: quantity,
  onCartOpen,
  onSearchSubmit,
  onSetupOpen,
  orderType,
  query,
  selectedArea,
  setQuery,
}: {
  cartQuantity: number;
  onCartOpen: () => void;
  onSearchSubmit: () => void;
  onSetupOpen: () => void;
  orderType: OrderType;
  query: string;
  selectedArea?: DeliveryArea;
  setQuery: (value: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-transparent bg-white/96 shadow-[0_8px_28px_rgba(22,22,22,0.08)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-3 px-4">
        <a className="group flex items-center gap-2" href="/">
          <BrandMark compact className="hover-lift h-12 w-12 group-hover:-rotate-3" />
          <div className="hidden sm:block">
            <p className="text-base font-black uppercase text-[#161616]">Flavour Heaven</p>
            <p className="text-xs font-black text-[#5f5f5f]">Eat great food - E-11/3 Markaz</p>
          </div>
        </a>

        <button
          className="hover-lift icon-bounce focus-ring hidden max-w-[390px] items-center gap-2 rounded-full border-2 border-transparent bg-[#ffdd00] px-4 py-2 text-sm font-extrabold text-[#161616] md:inline-flex"
          onClick={onSetupOpen}
          type="button"
        >
          <MapPin size={17} className="text-[#161616]" />
          {orderType === "delivery" ? selectedArea?.label ?? "Select area" : branchAddress}
          <ChevronDown size={16} className="text-[#161616]" />
        </button>

        <div className="flex items-center gap-2">
          <HeaderSearch onSubmit={onSearchSubmit} query={query} setQuery={setQuery} />
          <a
            aria-label="Call Flavour Heaven"
            className="hover-lift icon-bounce focus-ring grid h-11 w-11 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-[#161616]"
            href={`tel:${shopPhone}`}
          >
            <Phone size={19} />
          </a>
          <button
            aria-label="Open cart"
            className="hover-lift icon-bounce focus-ring relative grid h-11 w-11 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-[#161616]"
            data-testid="header-cart-button"
            onClick={onCartOpen}
            type="button"
          >
            <ShoppingBag size={20} />
            {quantity ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-transparent bg-white px-1 text-xs font-black text-[#161616]">
                {quantity}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}

function HeaderSearch({
  onSubmit,
  query,
  setQuery,
}: {
  onSubmit: () => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = expanded || query.length > 0;

  return (
    <form
      className={cn(
        "header-search flex items-center rounded-full transition-all duration-300",
        open ? "bg-white shadow-[0_8px_24px_rgba(22,22,22,0.14)]" : "",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
        inputRef.current?.blur();
      }}
      role="search"
    >
      <button
        aria-label="Search the menu"
        className="hover-lift icon-bounce focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-[#161616]"
        onClick={() => {
          setExpanded(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        type="button"
      >
        <Search size={19} />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "w-[min(220px,42vw)]" : "w-0",
        )}
      >
        <input
          aria-hidden={!open}
          className="w-full bg-transparent px-2 py-2.5 text-sm font-bold text-[#161616] outline-none placeholder:text-[#767676]"
          onBlur={() => {
            if (!query) setExpanded(false);
          }}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              setExpanded(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search pizza, zinger, shawarma..."
          ref={inputRef}
          tabIndex={open ? 0 : -1}
          value={query}
        />
      </div>
      {open && query ? (
        <button
          aria-label="Clear search"
          className="icon-bounce focus-ring mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#161616]"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          type="button"
        >
          <X size={16} />
        </button>
      ) : null}
    </form>
  );
}

function OrderSetupModal({
  deliveryAreas,
  hasLocation,
  locationMessage,
  locationStatus,
  onConfirm,
  onOrderTypeChange,
  onRequestLocation,
  onSelectedAreaChange,
  open,
  orderType,
  selectedArea,
  showClose,
}: {
  deliveryAreas: DeliveryArea[];
  hasLocation: boolean;
  locationMessage: string;
  locationStatus: LocationStatus;
  onConfirm: () => void;
  onOrderTypeChange: (orderType: OrderType) => void;
  onRequestLocation: () => void;
  onSelectedAreaChange: (areaId: string) => void;
  open: boolean;
  orderType: OrderType;
  selectedArea: string;
  showClose: boolean;
}) {
  useModalA11y(open, showClose, onConfirm);

  if (!open) return null;

  const area = deliveryAreas.find((item) => item.id === selectedArea) ?? deliveryAreas[0];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#161616]/45 p-4 backdrop-blur-sm"
      data-testid="order-setup-modal"
      onClick={(event) => {
        if (showClose && event.target === event.currentTarget) onConfirm();
      }}
    >
      <div
        aria-label="Choose how your order is served"
        aria-modal="true"
        className="animate-panel-in max-h-[calc(100vh-32px)] w-full max-w-[500px] overflow-y-auto rounded-[28px] border-2 border-transparent bg-white shadow-[0_24px_80px_rgba(22,22,22,0.34)]"
        role="dialog"
      >
        <div className="relative grid h-28 place-items-center bg-[#ffdd00]">
          {showClose ? (
            <button
              aria-label="Close order setup"
              className="hover-lift icon-bounce absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border-2 border-transparent bg-white text-[#161616]"
              onClick={onConfirm}
              type="button"
            >
              <X size={20} />
            </button>
          ) : null}
          <BrandMark compact className="h-20 w-20" />
        </div>

        <div className="p-5 sm:p-6">
          <h2 className="text-center text-2xl font-black text-[#161616]">How should we serve you?</h2>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm font-bold leading-6 text-[#5f5f5f]">
            Choose once, then browse the full Flavour Heaven menu with the right fees and checkout fields.
          </p>
          <div className="mx-auto mt-5 grid max-w-[430px] gap-2 sm:grid-cols-3">
            {orderTypeOptions.map((option) => {
              const active = orderType === option.id;
              const Icon = option.icon;
              return (
                <button
                  className={cn(
                    "hover-lift icon-bounce focus-ring rounded-[18px] border-2 px-3 py-3 text-sm font-black transition",
                    active
                      ? "border-transparent bg-[#ffdd00] text-[#161616] shadow-lift"
                      : "border-transparent bg-[#fff9d7] text-[#161616]",
                  )}
                  key={option.id}
                  onClick={() => onOrderTypeChange(option.id)}
                  type="button"
                >
                  <span className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-transparent bg-[#ffdd00] text-[#161616]">
                    <Icon size={17} />
                  </span>
                  <span className="mt-2 block">{option.label}</span>
                  <span className={cn("mt-1 block text-[11px]", active ? "text-[#4f4f4f]" : "text-[#5f5f5f]")}>
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          {orderType === "delivery" ? (
            <div className="mt-5 space-y-4">
              <p className="text-center text-sm font-semibold text-[#555b6f]">
                Tell us your sector first. E-11 stays free; nearby sectors show the fee upfront.
              </p>
              <button
                className="hover-lift icon-bounce focus-ring mx-auto flex items-center justify-center gap-2 rounded-full border-2 border-transparent bg-[#ffdd00] px-4 py-3 text-sm font-black text-[#161616]"
                disabled={locationStatus === "loading"}
                onClick={onRequestLocation}
                type="button"
              >
                {locationStatus === "loading" ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <LocateFixed size={18} />
                )}
                {locationStatus === "loading" ? "Detecting Location" : "Use Current Location"}
              </button>
              {locationMessage ? (
                <p
                  className={cn(
                    "text-center text-xs font-bold",
                    locationStatus === "ready" ? "text-[#15803d]" : "text-[#5f5f5f]",
                    locationStatus === "error" || locationStatus === "unsupported"
                      ? "text-[#b42318]"
                      : "",
                  )}
                >
                  {locationMessage}
                </p>
              ) : null}
              {hasLocation ? (
                <p className="text-center text-xs font-bold text-[#15803d]">
                  We saved your GPS pin - it will be attached to your delivery automatically.
                </p>
              ) : null}
              <label className="block">
                <span className="text-sm font-black text-[#161616]">Select Delivery Sector</span>
                <select
                  className="focus-ring mt-2 w-full rounded-[16px] border-2 border-transparent bg-white px-4 py-4 font-bold text-[#161616]"
                  onChange={(event) => onSelectedAreaChange(event.target.value)}
                  value={selectedArea}
                >
                  {deliveryAreas.map((deliveryArea) => (
                    <option key={deliveryArea.id} value={deliveryArea.id}>
                      {deliveryArea.label} - {deliveryFeeLabel(deliveryArea.fee)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-[18px] border-2 border-transparent bg-[#fff9d7] p-4">
                <p className="font-black text-[#161616]">
                  {area?.label ?? "Selected area"} - {deliveryFeeLabel(area?.fee ?? 0)}
                </p>
                <p className="mt-1 text-sm font-bold text-[#5f5f5f]">Estimated delivery: {area?.eta}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="text-center text-sm font-semibold text-[#555b6f]">
                {orderType === "pickup"
                  ? "Your food will be packed fresh and ready at the counter."
                  : "Park near the branch and we will bring your order outside."}
              </p>
              <label className="block">
                <span className="text-sm font-black text-[#161616]">Select Branch</span>
                <div className="mt-2 flex items-center justify-between rounded-[16px] border-2 border-transparent bg-white px-4 py-4 font-bold text-[#161616]">
                  Flavour Heaven
                  <ChevronDown size={18} className="text-[#161616]" />
                </div>
              </label>
              <div className="rounded-[18px] border-2 border-transparent bg-[#fff9d7] p-4">
                <div className="flex gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border-2 border-transparent bg-[#ffdd00] text-[#161616]">
                    <MapPin size={19} />
                  </span>
                  <div>
                    <p className="font-black text-[#161616]">Branch Location</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-[#5f5f5f]">{branchAddress}</p>
                    <a
                      className="mt-2 inline-flex items-center gap-2 text-sm font-black text-[#161616]"
                      href={branchDirectionsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Navigation size={16} /> Get Directions
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            className="action-button hover-lift icon-bounce focus-ring mt-6 w-full rounded-[18px] border-2 border-transparent bg-[#ffdd00] px-5 py-4 text-lg font-black text-[#161616] shadow-[0_14px_35px_rgba(22,22,22,0.18)]"
            data-testid="order-setup-select"
            onClick={onConfirm}
            type="button"
          >
            Start Ordering
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroBanners() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (bannerSlides.length < 2) return;
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % bannerSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const banner = bannerSlides[activeSlide];

  return (
    <section className="animate-fade-up hover-lift relative overflow-hidden rounded-[28px] border-2 border-transparent shadow-lift">
      <div className="relative min-h-[200px] sm:min-h-[280px]">
        {bannerSlides.map((slide, index) => (
          <Image
            alt="Flavour Heaven banner"
            className={cn(
              "object-cover transition-opacity duration-700",
              index === activeSlide ? "opacity-100" : "opacity-0",
            )}
            fill
            key={slide.image}
            priority={index === 0}
            sizes="(max-width: 1180px) 100vw, 1180px"
            src={slide.image}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="relative flex h-full min-h-[200px] flex-col justify-end p-5 sm:min-h-[280px] sm:p-7">
          <p className="inline-flex w-fit rounded-full border-2 border-transparent bg-[#ffdd00] px-3 py-1.5 text-xs font-black uppercase text-[#161616]">
            {banner.kicker}
          </p>
          <h1 className="mt-3 max-w-xl text-xl font-black leading-tight text-white [text-shadow:0_4px_18px_rgba(0,0,0,0.55)] sm:text-3xl">
            {banner.title}
          </h1>
          <p className="mt-2 hidden max-w-md text-sm font-bold leading-6 text-white/90 sm:block">
            Free delivery inside E-11. Fast pickup and car-hop from E-11/3 Markaz. No hidden fees at checkout.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase">
            <span className="hover-lift rounded-full border-2 border-white/50 bg-black/40 px-4 py-2 text-white backdrop-blur">
              Open 24/7
            </span>
            <span className="hover-lift rounded-full border-2 border-white/50 bg-black/40 px-4 py-2 text-white backdrop-blur">
              Cash on delivery
            </span>
            <span className="hover-lift rounded-full border-2 border-white/50 bg-black/40 px-4 py-2 text-white backdrop-blur">
              WhatsApp handoff
            </span>
          </div>
          {bannerSlides.length > 1 ? (
            <div className="mt-4 flex gap-2">
              {bannerSlides.map((slide, index) => (
                <button
                  aria-label={`Show banner ${index + 1}`}
                  className={cn(
                    "focus-ring h-2 rounded-full transition-all",
                    index === activeSlide ? "w-8 bg-[#ffdd00]" : "w-2 bg-white/60",
                  )}
                  key={slide.image}
                  onClick={() => setActiveSlide(index)}
                  type="button"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CategoryTabs({
  activeCategory,
  categories,
  onChange,
}: {
  activeCategory: string;
  categories: PublicMenu["categories"];
  onChange: (categoryId: string) => void;
}) {
  return (
    <div className="sticky top-16 z-30 -mx-4 mt-4 border-y-2 border-transparent bg-white/96 px-4 py-3 shadow-[0_8px_24px_rgba(22,22,22,0.08)] backdrop-blur">
      <div className="menu-scrollbar flex gap-3 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            className={cn(
              "category-chip focus-ring whitespace-nowrap rounded-full border-2 px-5 py-3 text-sm font-black transition",
              activeCategory === category.id
                ? "border-transparent bg-[#ffdd00] text-[#161616] shadow-lift"
                : "border-transparent bg-white text-[#161616] hover:border-transparent hover:bg-[#fff4a8]",
            )}
            key={category.id}
            onClick={() => onChange(category.id)}
            type="button"
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function PromoCard() {
  return (
    <section className="animate-fade-up hover-lift mt-4 rounded-[18px] border-2 border-transparent bg-white p-3.5 text-[#161616] shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-[#161616]">
          <Gift size={17} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-base font-black">Flat</p>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ffdd00] text-sm font-black text-[#161616]">
              15
            </span>
            <p className="text-base font-black">% Off</p>
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-[#4f4f4f]">
            Late-night special: mention code <span className="font-black text-[#161616]">HEAVEN15</span> on
            WhatsApp for 15% off selected favourites, 01:00 PM to 04:00 AM. Our team applies it on confirmation.
          </p>
        </div>
      </div>
    </section>
  );
}

function CategoryBanner({
  activeCategory,
  categories,
  isSearching,
  query,
  resultCount,
}: {
  activeCategory: string;
  categories: PublicMenu["categories"];
  isSearching: boolean;
  query: string;
  resultCount: number;
}) {
  const category = categories.find((item) => item.id === activeCategory) ?? categories[0];
  const title = isSearching ? `Search results for "${query.trim()}"` : category?.name ?? "Menu";
  const description = isSearching
    ? `${resultCount} menu item${resultCount === 1 ? "" : "s"} matched across the full Flavour Heaven menu.`
    : category?.description;

  return (
    <div className="animate-fade-up overflow-hidden rounded-[28px] border-2 border-transparent bg-[#ffdd00] p-6 text-[#161616] shadow-lift">
      <p className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-black uppercase text-[#161616]">
        {isSearching ? "Full menu search" : "Now serving"}
      </p>
      <h2 className="mt-2 text-4xl font-black text-[#161616]">{title}</h2>
      <p className="mt-2 max-w-xl text-sm font-bold text-[#4f4f4f]">{description}</p>
    </div>
  );
}

function MenuItemCard({ item, onOpen }: { item: MenuItem; onOpen: (item: MenuItem) => void }) {
  return (
    <article className="food-card hover-lift relative overflow-hidden rounded-[22px] border-2 border-transparent bg-white p-4 shadow-[0_8px_28px_rgba(22,22,22,0.08)]">
      {item.isPopular ? (
        <span className="absolute right-5 top-3 z-10 rounded-full border border-transparent bg-[#ffdd00] px-4 py-1 text-xs font-black text-[#161616]">
          Popular
        </span>
      ) : null}
      <div className="grid min-h-[176px] grid-cols-[1fr_150px] gap-3">
        <div className="flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-[#161616]">{item.name}</h3>
            <p className="mt-4 line-clamp-3 text-sm font-bold leading-6 text-[#767676]">
              {item.description}
            </p>
          </div>
          <p className="mt-4 text-lg font-black text-[#161616]">From {formatPrice(item.price)}</p>
        </div>
        <div className="relative min-h-[150px]">
          <Image
            alt={item.name}
            className="rounded-[20px] object-cover"
            fill
            sizes="(max-width: 640px) 45vw, 150px"
            src={item.image}
          />
          <button
            aria-label={`Add ${item.name}`}
            className="add-orbit focus-ring absolute -bottom-1 -right-1 grid h-12 w-12 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-[#161616] shadow-lift"
            onClick={() => onOpen(item)}
            type="button"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ItemModal({
  addSelectedItem,
  item,
  onClose,
  quantity,
  selectedAddOns,
  setQuantity,
  toggleAddOn,
}: {
  addSelectedItem: () => void;
  item: MenuItem;
  onClose: () => void;
  quantity: number;
  selectedAddOns: AddOn[];
  setQuantity: (quantity: number) => void;
  toggleAddOn: (addOn: AddOn) => void;
}) {
  const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const itemTotal = (item.price + addOnTotal) * quantity;

  useModalA11y(true, true, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#161616]/55 p-0 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-label={item.name}
        aria-modal="true"
        className="animate-sheet-in max-h-[94vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] border-2 border-transparent bg-white shadow-warm sm:rounded-[28px]"
        role="dialog"
      >
        <div className="relative h-[310px] overflow-hidden bg-[#161616]">
          <Image
            alt={item.name}
            className="object-cover opacity-90"
            fill
            sizes="(max-width: 520px) 100vw, 520px"
            src={item.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <button
            aria-label="Close item"
            className="hover-lift icon-bounce absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-[#161616] shadow-lift"
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <h2 className="text-3xl font-black">{item.name}</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-white/86">{item.description}</p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between border-b-2 border-transparent pb-4">
            <div>
              <p className="text-2xl font-black text-[#161616]">{formatPrice(item.price)}</p>
              <p className="mt-1 text-sm font-bold text-[#767676]">Base price</p>
            </div>
            <div className="control-outline inline-flex items-center rounded-full border-2 border-transparent bg-[#fff9d7] p-1">
              <button
                aria-label="Decrease quantity"
                className="hover-lift icon-bounce grid h-9 w-9 place-items-center rounded-full text-[#161616]"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                type="button"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-8 text-center font-black">{quantity}</span>
              <button
                aria-label="Increase quantity"
                className="hover-lift icon-bounce grid h-9 w-9 place-items-center rounded-full text-[#161616] disabled:opacity-40"
                disabled={quantity >= MAX_ITEM_QUANTITY}
                onClick={() => setQuantity(Math.min(MAX_ITEM_QUANTITY, quantity + 1))}
                type="button"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border-2 border-transparent bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-body text-lg font-black text-[#161616]">Make it yours</h3>
              <span className="rounded-full border border-transparent px-3 py-1 text-xs font-black text-[#161616]">
                Optional
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {item.addOns.length ? (
                item.addOns.map((addOn) => {
                  const active = selectedAddOns.some((selected) => selected.id === addOn.id);
                  return (
                    <button
                      className={cn(
                        "hover-lift focus-ring flex w-full items-center justify-between rounded-[14px] border-2 px-4 py-3 text-left font-bold",
                        active
                          ? "border-transparent bg-[#fff9d7]"
                          : "border-transparent bg-white",
                      )}
                      key={addOn.id}
                      onClick={() => toggleAddOn(addOn)}
                      type="button"
                    >
                      <span className="flex items-center gap-3 text-[#161616]">
                        <span
                          className={cn(
                            "grid h-5 w-5 place-items-center rounded-[6px] border",
                            active
                              ? "border-transparent bg-[#ffdd00] text-[#161616]"
                              : "border-transparent",
                          )}
                        >
                          {active ? <CheckCircle2 size={14} /> : null}
                        </span>
                        {addOn.name}
                      </span>
                      <span className="text-[#161616]">{formatPrice(addOn.price)}</span>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-[14px] bg-[#fff9d7] p-4 text-sm font-bold text-[#5f5f5f]">
                  No add-ons for this item yet.
                </p>
              )}
            </div>
          </div>

          <button
            className="action-button hover-lift icon-bounce focus-ring mt-5 flex w-full items-center justify-between rounded-[20px] border-2 border-transparent bg-[#ffdd00] px-5 py-4 text-lg font-black text-[#161616]"
            data-testid="item-add-to-cart"
            onClick={addSelectedItem}
            type="button"
          >
            <span>Add to cart</span>
            <span>{formatPrice(itemTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

type CreatedOrder = {
  reference: string;
  status: string;
  persisted: boolean;
  totals: {
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
  trackingUrl: string;
  whatsappUrl: string;
  deliveryMapUrl?: string | null;
};

function CartDrawer({
  areaId,
  areaLabel,
  cart,
  clearCart,
  deliveryFee,
  deliveryLocation,
  locationMessage,
  locationStatus,
  onClose,
  onQuickAdd,
  onRequestLocation,
  onStartAnotherOrder,
  open,
  orderType,
  popularItems,
  total,
  updateQuantity,
}: {
  areaId: string;
  areaLabel: string;
  cart: CartLine[];
  clearCart: () => void;
  deliveryFee: number;
  deliveryLocation: DeliveryLocation | null;
  locationMessage: string;
  locationStatus: LocationStatus;
  onClose: () => void;
  onQuickAdd: (item: MenuItem) => void;
  onRequestLocation: () => void;
  onStartAnotherOrder: () => void;
  open: boolean;
  orderType: OrderType;
  popularItems: MenuItem[];
  total: number;
  updateQuantity: (lineId: string, nextQuantity: number) => void;
}) {
  const subtotal = cartSubtotal(cart);
  const [title, setTitle] = useState("Mr.");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [carDetails, setCarDetails] = useState("");
  const [instructions, setInstructions] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const normalizedPhone = useMemo(() => normalizePakistanMobileNumber(phone), [phone]);
  const phoneError = phone.trim() && !normalizedPhone ? PAKISTAN_MOBILE_ERROR : "";

  useModalA11y(open, true, onClose);

  if (!open) return null;

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setCreatedOrder(null);

    if (!normalizedPhone) {
      setSubmitError(PAKISTAN_MOBILE_ERROR);
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/public/orders", {
      body: JSON.stringify({
        address: orderType === "delivery" ? address : undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        carDetails: orderType === "carhop" ? carDetails : undefined,
        customerName: [title, customerName.trim()].filter(Boolean).join(" "),
        deliveryArea: orderType === "delivery" ? areaId : undefined,
        deliveryLocation: orderType === "delivery" ? deliveryLocation ?? undefined : undefined,
        instructions,
        landmark: orderType === "delivery" ? landmark : undefined,
        lines: cart.map((line) => ({
          addOnIds: line.addOns.map((addOn) => addOn.id),
          menuItemId: line.item.id,
          quantity: line.quantity,
        })),
        orderType,
        phone: normalizedPhone.e164,
      }),
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      method: "POST",
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response) {
      setSubmitError("Network issue. Please try again.");
      return;
    }

    const payload = await response.json();
    if (!response.ok) {
      setSubmitError(payload.message ?? "Please check the order and try again.");
      return;
    }

    setCreatedOrder(payload);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#161616]/45 backdrop-blur-sm"
      data-testid="cart-drawer"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        aria-label="Your cart and checkout"
        aria-modal="true"
        className="animate-drawer-in flex h-full w-full max-w-[520px] flex-col bg-[#fff9d7] shadow-warm"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b-2 border-transparent bg-[#ffdd00] px-5 py-5 text-[#161616]">
          <div className="flex items-center gap-3">
            <ShoppingBag size={22} />
            <h2 className="font-body text-2xl font-black">Your Cart</h2>
          </div>
          <button
            aria-label="Close cart"
            className="hover-lift icon-bounce grid h-11 w-11 place-items-center rounded-full border-2 border-transparent bg-white text-[#161616]"
            onClick={onClose}
            type="button"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {createdOrder ? (
            <div className="rounded-[22px] border border-[#bbf7d0] bg-[#f0fdf4] p-5">
              <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 text-[#16a34a]" />
                  <div>
                  <p className="font-black text-[#14532d]">Order received</p>
                  <p className="mt-1 text-sm text-[#166534]">
                    Reference {createdOrder.reference}. Status: {createdOrder.status}.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <a
                  className="hover-lift icon-bounce focus-ring inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#16a34a] px-4 py-3 font-black text-white"
                  href={createdOrder.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle size={18} /> Send on WhatsApp
                </a>
                {createdOrder.deliveryMapUrl ? (
                  <a
                    className="hover-lift icon-bounce focus-ring inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#bbf7d0] bg-white px-4 py-3 font-black text-[#166534]"
                    href={createdOrder.deliveryMapUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <LocateFixed size={18} /> Open my location in Maps
                  </a>
                ) : null}
                <a
                  className="hover-lift icon-bounce focus-ring inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#bbf7d0] bg-white px-4 py-3 font-black text-[#166534]"
                  href={createdOrder.trackingUrl}
                >
                  Track order <ChevronRight size={18} />
                </a>
                <button
                  className="hover-lift rounded-[18px] px-4 py-2 text-sm font-bold text-[#166534]"
                  onClick={() => {
                    clearCart();
                    setCreatedOrder(null);
                    setIdempotencyKey(crypto.randomUUID());
                    onStartAnotherOrder();
                  }}
                  type="button"
                >
                  Start another order
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.length ? (
                  cart.map((line) => (
                    <div className="hover-lift rounded-[22px] border-2 border-transparent bg-white p-4 shadow-sm" key={line.id}>
                      <div className="flex gap-3">
                        <Image
                          alt={line.item.name}
                          className="h-20 w-20 rounded-[18px] object-cover"
                          height={80}
                          src={line.item.image}
                          width={80}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-black text-[#161616]">{line.item.name}</p>
                          <p className="mt-1 text-xl font-black text-[#161616]">
                            {formatPrice(lineTotal(line))}
                          </p>
                          {line.addOns.length ? (
                            <p className="mt-2 text-sm font-bold text-[#161616]">
                              {line.addOns.map((addOn) => addOn.name).join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="control-outline flex h-11 overflow-hidden rounded-full border-2 border-transparent">
                          <button
                            aria-label={`Remove ${line.item.name}`}
                            className="hover-lift icon-bounce grid w-11 place-items-center text-[#161616]"
                            onClick={() => updateQuantity(line.id, 0)}
                            type="button"
                          >
                            <Trash2 size={17} />
                          </button>
                          <span className="grid w-11 place-items-center bg-[#ffdd00] font-black text-[#161616]">
                            {line.quantity}
                          </span>
                          <button
                            aria-label="Increase quantity"
                            className="hover-lift icon-bounce grid w-11 place-items-center text-[#161616] disabled:opacity-40"
                            disabled={line.quantity >= MAX_ITEM_QUANTITY}
                            onClick={() => updateQuantity(line.id, line.quantity + 1)}
                            type="button"
                          >
                            <Plus size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border-2 border-dashed border-transparent bg-white p-8 text-center shadow-lift">
                    <p className="font-black text-[#161616]">Cart is empty.</p>
                    <p className="mt-2 text-sm font-bold text-[#5f5f5f]">Add a favourite from the menu.</p>
                    <button
                      className="action-button hover-lift icon-bounce focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#ffdd00] px-5 py-3 font-black text-[#161616]"
                      onClick={onClose}
                      type="button"
                    >
                      Browse the menu <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              {popularItems.length && cart.length ? (
                <section className="mt-6">
                  <div className="flex items-center gap-2">
                    <Flame size={20} className="text-[#161616]" />
                    <h3 className="font-body font-black text-[#161616]">Popular with your order</h3>
                  </div>
                  <div className="menu-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">
                    {popularItems.slice(0, 4).map((item) => (
                      <button
                        aria-label={`Add ${item.name} to your order`}
                        className="hover-lift focus-ring group w-32 shrink-0 text-left"
                        key={item.id}
                        onClick={() => onQuickAdd(item)}
                        type="button"
                      >
                        <span className="relative block h-24 w-full">
                          <Image
                            alt={item.name}
                            className="rounded-[18px] object-cover"
                            fill
                            sizes="128px"
                            src={item.image}
                          />
                          <span className="absolute -bottom-1 -right-1 z-10 grid h-8 w-8 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-[#161616] shadow-lift">
                            <Plus size={16} />
                          </span>
                        </span>
                        <span className="mt-2 block text-sm font-black text-[#161616]">
                          {formatPrice(item.price)}
                        </span>
                        <span className="block truncate text-xs font-bold text-[#5f5f5f]">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="hover-lift mt-6 rounded-[22px] border-2 border-transparent bg-white p-5 shadow-sm">
                <div className="flex justify-between text-sm font-bold text-[#5f5f5f]">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="mt-3 flex justify-between text-sm font-bold text-[#5f5f5f]">
                  <span>Delivery</span>
                  <span>{deliveryFee ? formatPrice(deliveryFee) : "Free"}</span>
                </div>
                <div className="mt-5 flex justify-between border-t-2 border-transparent pt-5 text-2xl font-black text-[#161616]">
                  <span>Grand Total</span>
                  <span className="text-[#161616]">{formatPrice(total)}</span>
                </div>
              </div>

              {cart.length ? (
                <CheckoutForm
                  address={address}
                  alternatePhone={alternatePhone}
                  setAlternatePhone={setAlternatePhone}
                  carDetails={carDetails}
                  customerName={customerName}
                  instructions={instructions}
                  landmark={landmark}
                  locationMessage={locationMessage}
                  locationStatus={locationStatus}
                  orderType={orderType}
                  phone={phone}
                  phoneError={phoneError}
                  normalizedPhoneDisplay={normalizedPhone?.display}
                  requestDeliveryLocation={onRequestLocation}
                  setAddress={setAddress}
                  setCarDetails={setCarDetails}
                  setCustomerName={setCustomerName}
                  setInstructions={setInstructions}
                  setLandmark={setLandmark}
                  setPhone={setPhone}
                  setTitle={setTitle}
                  submitError={submitError}
                  submitOrder={submitOrder}
                  isSubmitting={isSubmitting}
                  areaLabel={areaLabel}
                  title={title}
                />
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function CheckoutForm({
  address,
  alternatePhone,
  setAlternatePhone,
  areaLabel,
  carDetails,
  customerName,
  instructions,
  isSubmitting,
  landmark,
  locationMessage,
  locationStatus,
  orderType,
  phone,
  phoneError,
  normalizedPhoneDisplay,
  requestDeliveryLocation,
  setAddress,
  setCarDetails,
  setCustomerName,
  setInstructions,
  setLandmark,
  setPhone,
  setTitle,
  submitError,
  submitOrder,
  title,
}: {
  address: string;
  alternatePhone: string;
  setAlternatePhone: (value: string) => void;
  areaLabel: string;
  carDetails: string;
  customerName: string;
  instructions: string;
  isSubmitting: boolean;
  landmark: string;
  locationMessage: string;
  locationStatus: "idle" | "loading" | "ready" | "error" | "unsupported";
  orderType: OrderType;
  phone: string;
  phoneError: string;
  normalizedPhoneDisplay?: string;
  requestDeliveryLocation: () => void;
  setAddress: (value: string) => void;
  setCarDetails: (value: string) => void;
  setCustomerName: (value: string) => void;
  setInstructions: (value: string) => void;
  setLandmark: (value: string) => void;
  setPhone: (value: string) => void;
  setTitle: (value: string) => void;
  submitError: string;
  submitOrder: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
}) {
  return (
    <form className="mt-6 space-y-4" onSubmit={submitOrder}>
      <div className="hover-lift rounded-[18px] border-2 border-transparent bg-white p-4">
        <p className="flex items-center gap-2 font-black text-[#161616]">
          <UserRound size={18} className="text-[#161616]" /> Checkout details
        </p>
        <p className="mt-1 text-sm font-bold text-[#5f5f5f]">
          {orderType === "delivery"
            ? `Delivery to ${areaLabel}`
            : orderType === "pickup"
              ? "Takeaway from E-11/3 Markaz"
              : "Car-hop from E-11/3 Markaz"}
        </p>
      </div>

      <div className="grid grid-cols-[96px_1fr] gap-3">
        <label className="block">
          <span className="text-sm font-black text-[#161616]">Title</span>
          <select
            className="hover-lift focus-ring mt-2 w-full rounded-[14px] border-2 border-transparent bg-white px-3 py-3 font-bold text-[#161616]"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          >
            <option value="Mr.">Mr.</option>
            <option value="Ms.">Ms.</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-black text-[#161616]">Full Name</span>
          <input
            className="hover-lift focus-ring mt-2 w-full rounded-[14px] border-2 border-transparent bg-white px-4 py-3 font-bold text-[#161616]"
            minLength={2}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Full Name"
            required
            value={customerName}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-black text-[#161616]">Mobile Number</span>
        <input
          className="hover-lift focus-ring mt-2 w-full rounded-[14px] border-2 border-transparent bg-white px-4 py-3 font-bold text-[#161616]"
          aria-invalid={Boolean(phoneError)}
          inputMode="tel"
          maxLength={24}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="0300-1234567"
          required
          value={phone}
        />
        {phoneError ? (
          <p className="mt-2 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-bold text-[#b91c1c]">
            {phoneError}
          </p>
        ) : (
          <p className="mt-2 text-xs font-bold text-[#5f5f5f]">
            {normalizedPhoneDisplay
              ? `We will save it as ${normalizedPhoneDisplay} for WhatsApp updates.`
              : "Use 03xx-xxxxxxx or +92 3xx xxxxxxx."}
          </p>
        )}
        <p className="mt-1 text-xs text-[#78716c]">
          We will contact you on this number for order updates - please make sure it is correct
          and reachable.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-black text-[#161616]">
          Additional contact number <span className="font-bold text-[#78716c]">(optional)</span>
        </span>
        <input
          className="hover-lift focus-ring mt-2 w-full rounded-[14px] border-2 border-transparent bg-white px-4 py-3 font-bold text-[#161616]"
          inputMode="tel"
          maxLength={24}
          onChange={(event) => setAlternatePhone(event.target.value)}
          placeholder="A backup number, if the first is unreachable"
          value={alternatePhone}
        />
      </label>

      {orderType === "delivery" ? (
        <>
          <label className="block">
            <span className="text-sm font-black text-[#161616]">Full Address</span>
            <textarea
              className="hover-lift focus-ring mt-2 min-h-24 w-full resize-none rounded-[14px] border-2 border-transparent bg-white px-4 py-3 font-bold text-[#161616]"
              onChange={(event) => setAddress(event.target.value)}
              placeholder="House, street, sector, floor, gate..."
              required
              value={address}
            />
          </label>
          <div className="hover-lift rounded-[18px] border-2 border-transparent bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-[#161616]">GPS delivery pin</p>
                <p className="mt-1 text-xs font-bold text-[#5f5f5f]">
                  Helps the rider find you faster. Manual address is still required.
                </p>
              </div>
              <button
                className="hover-lift icon-bounce focus-ring inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-[#ffdd00] px-4 py-3 text-sm font-black text-[#161616]"
                disabled={locationStatus === "loading"}
                onClick={requestDeliveryLocation}
                type="button"
              >
                {locationStatus === "loading" ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <LocateFixed size={17} />
                )}
                Use GPS
              </button>
            </div>
            {locationMessage ? (
              <p
                className={cn(
                  "mt-3 rounded-[12px] px-3 py-2 text-xs font-bold",
                  locationStatus === "ready"
                    ? "bg-[#f0fdf4] text-[#166534]"
                    : "bg-[#fff9d7] text-[#5f5f5f]",
                )}
              >
                {locationMessage}
              </p>
            ) : null}
          </div>
          <label className="block">
            <span className="text-sm font-black text-[#161616]">Landmark</span>
            <input
              className="hover-lift focus-ring mt-2 w-full rounded-[14px] border-2 border-transparent bg-white px-4 py-3 font-bold text-[#161616]"
              onChange={(event) => setLandmark(event.target.value)}
              placeholder="Near park, school, masjid..."
              value={landmark}
            />
          </label>
        </>
      ) : null}

      {orderType === "carhop" ? (
        <label className="block">
          <span className="text-sm font-black text-[#161616]">Car Details</span>
          <input
            className="hover-lift focus-ring mt-2 w-full rounded-[14px] border-2 border-transparent bg-white px-4 py-3 font-bold text-[#161616]"
            onChange={(event) => setCarDetails(event.target.value)}
            placeholder="White Corolla, plate ABC-123"
            required
            value={carDetails}
          />
        </label>
      ) : null}

      <label className="block">
        <span className="text-sm font-black text-[#161616]">Special Instructions</span>
        <textarea
          className="hover-lift focus-ring mt-2 min-h-24 w-full resize-none rounded-[14px] border-2 border-transparent bg-white px-4 py-3 font-bold text-[#161616]"
          maxLength={500}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Less spicy, extra sauce, no onions..."
          value={instructions}
        />
      </label>

      {submitError ? (
        <p className="rounded-[16px] border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
          {submitError}
        </p>
      ) : null}

      <button
        className="action-button hover-lift icon-bounce focus-ring inline-flex w-full items-center justify-center gap-2 rounded-[20px] border-2 border-transparent bg-[#ffdd00] px-4 py-4 text-lg font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
        disabled={isSubmitting || Boolean(phoneError)}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Confirming...
          </>
        ) : (
          <>
            Confirm Order <ChevronRight size={20} />
          </>
        )}
      </button>
      <p className="flex items-start gap-2 text-xs font-bold leading-5 text-[#5f5f5f]">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#16a34a]" size={16} />
        Your order is recalculated securely on the server before it is saved. Staff screens only open for allowed roles.
      </p>
    </form>
  );
}

function FloatingWhatsApp({ raised }: { raised: boolean }) {
  return (
    <a
      aria-label="Chat with Flavour Heaven on WhatsApp"
      className={cn(
        "action-button hover-lift icon-bounce focus-ring fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full border-2 border-white bg-[#16a34a] text-white shadow-[0_18px_42px_rgba(22,163,74,0.35)] sm:right-6",
        raised ? "bottom-24 sm:bottom-6" : "bottom-5 sm:bottom-6",
      )}
      href={floatingWhatsappUrl}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle size={26} />
      <span className="sr-only">Chat on WhatsApp</span>
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-transparent bg-white px-4 pb-28 pt-12 text-[#161616]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 lg:grid-cols-[1fr_1.15fr_0.85fr]">
        <div>
          <BrandMark className="animate-float-slow h-24 w-24 border-transparent" />
          <h2 className="mt-5 text-3xl font-black text-[#161616]">Flavour Heaven</h2>
          <p className="mt-3 max-w-sm text-sm font-bold leading-6 text-[#4f4f4f]">
            Pizza, burgers, shawarma, wings, and loaded sides from E-11/3 Markaz. Delivered hot,
            packed for pickup, or served to your car.
          </p>
        </div>
        <div className="grid gap-3 text-sm font-bold">
          <div className="hover-lift rounded-[20px] border-2 border-transparent bg-[#fff9dc] p-4">
            <p className="text-xs font-black uppercase text-[#161616]">Call</p>
            <a className="mt-1 block text-lg font-black text-[#161616]" href={`tel:${shopPhone}`}>
              {shopPhone}
            </a>
          </div>
          <div className="hover-lift rounded-[20px] border-2 border-transparent bg-[#fff9dc] p-4">
            <p className="text-xs font-black uppercase text-[#161616]">Visit</p>
            <p className="mt-1 text-[#4f4f4f]">{branchAddress}</p>
          </div>
          <div className="hover-lift rounded-[20px] border-2 border-transparent bg-[#fff9dc] p-4">
            <p className="text-xs font-black uppercase text-[#161616]">Hours</p>
            <p className="mt-1 text-[#4f4f4f]">Open 24/7 for late cravings and family orders.</p>
          </div>
        </div>
        <div>
          <p className="text-lg font-black text-[#161616]">Follow Us</p>
          <div className="mt-4 flex gap-3">
            <a
              aria-label="Flavour Heaven on Facebook"
              className="hover-lift icon-bounce focus-ring grid h-11 w-11 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-sm font-black text-[#161616]"
              href="https://www.facebook.com/"
              rel="noreferrer"
              target="_blank"
            >
              f
            </a>
            <a
              aria-label="Flavour Heaven on Instagram"
              className="hover-lift icon-bounce focus-ring grid h-11 w-11 place-items-center rounded-full border-2 border-transparent bg-[#ffdd00] text-sm font-black text-[#161616]"
              href="https://www.instagram.com/"
              rel="noreferrer"
              target="_blank"
            >
              ig
            </a>
          </div>
          <p className="mt-6 max-w-xs text-sm font-bold leading-6 text-[#4f4f4f]">
            Order tracking is private and opens only from the secure link created after checkout.
          </p>
        </div>
      </div>
    </footer>
  );
}





