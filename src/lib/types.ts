import type { LucideIcon } from "lucide-react";

export type OrderType = "delivery" | "pickup" | "carhop";

export type Category = {
  id: string;
  name: string;
  description: string;
};

export type DeliveryArea = {
  id: string;
  label: string;
  fee: number;
  eta: string;
  minimumOrder?: number;
};

export type DeliveryLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
};

export type AddOn = {
  id: string;
  name: string;
  price: number;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tags: string[];
  addOns: AddOn[];
  isPopular?: boolean;
};

export type CartLine = {
  id: string;
  item: MenuItem;
  quantity: number;
  addOns: AddOn[];
  note?: string;
};

export type OrderTypeOption = {
  id: OrderType;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type PublicMenu = {
  categories: Category[];
  deliveryAreas: DeliveryArea[];
  items: MenuItem[];
  source?: "database" | "demo";
};
