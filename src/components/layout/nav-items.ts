import {
  Home, Users, Ruler, Scissors, Wallet, BarChart3,
  BookOpen, ReceiptText, Bell, Search, History, Settings2,
  DollarSign, UsersRound, Truck, Boxes, ShoppingCart, CreditCard, HandCoins
} from "lucide-react";

/** Shared dashboard navigation, used by both the desktop sidebar and the mobile drawer. */
export const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",    icon: Home },
  { href: "/customers",     label: "Customers",    icon: Users },
  { href: "/measurements",  label: "Measurements", icon: Ruler },
  { href: "/orders",        label: "Orders",       icon: Scissors },
  { href: "/orders/history",label: "Order History", icon: History },
  { href: "/payments",      label: "Payments",     icon: Wallet },
  { href: "/receivables",   label: "Receivables",  icon: HandCoins },
  { href: "/users",         label: "Users",        icon: Users },
  { href: "/search",        label: "Search",       icon: Search },
  { href: "/reports",       label: "Reports",      icon: BarChart3 },
  { href: "/expenses",      label: "Expenses",     icon: DollarSign },
  { href: "/employees",     label: "Employees",    icon: UsersRound },
  { href: "/suppliers",     label: "Suppliers",    icon: Truck },
  { href: "/products",      label: "Products",     icon: Boxes },
  { href: "/purchases",     label: "Purchases",    icon: ShoppingCart },
  { href: "/notifications", label: "Notifications",icon: Bell },
  { href: "/ledger",        label: "Ledger",       icon: BookOpen },
  { href: "/receipts",      label: "Receipts",     icon: ReceiptText },
  { href: "/billing",       label: "Subscription", icon: CreditCard },
  { href: "/settings",      label: "Settings",     icon: Settings2 },
] as const;
