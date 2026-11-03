import type { CSSProperties } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
  User,
  Menu,
  X,
  Check,
  CheckCircle2,
  Copy,
  Instagram,
  Facebook,
  Search,
  Star,
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Bell,
  Package,
  Truck,
  Info,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  AlertTriangle,
  Upload,
  LogOut,
  Settings,
  Edit,
  Eye,
  ExternalLink,
  Music2,
  Receipt,
  ShoppingBasket,
  KeyRound,
  Users,
  Palette,
  CreditCard,
  Megaphone,
  Images,
  Sparkles,
  Save,
  Download,
  DollarSign,
  Home,
  LayoutGrid,
  Send,
  Image as ImageIcon,
  Cloud,
  CloudOff,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

// Neutral name → lucide component map. Preserves the <Icon name="..."/> API
// used throughout the app. Names loosely match Ionicons; unknown names show a dot.
const MAP: Record<string, LucideIcon> = {
  "arrow-forward-outline": ArrowRight,
  "arrow-back-outline": ArrowLeft,
  "chevron-forward-outline": ChevronRight,
  "chevron-back-outline": ChevronLeft,
  "chevron-down-outline": ChevronDown,
  "chevron-up-outline": ChevronUp,
  "bag-outline": ShoppingBag,
  "cart-outline": ShoppingCart,
  "person-circle-outline": User,
  "menu-outline": Menu,
  "close-outline": X,
  "checkmark-outline": Check,
  "checkmark-circle-outline": CheckCircle2,
  "copy-outline": Copy,
  "logo-instagram": Instagram,
  "logo-tiktok": Music2,
  "logo-facebook": Facebook,
  "logo-whatsapp": MessageCircle,
  "search-outline": Search,
  "star-outline": Star,
  "star": Star,
  "trash-outline": Trash2,
  "add-outline": Plus,
  "remove-outline": Minus,
  "notifications-outline": Bell,
  "cube-outline": Package,
  "car-outline": Truck,
  "information-circle-outline": Info,
  "mail-outline": Mail,
  "call-outline": Phone,
  "location-outline": MapPin,
  "warning-outline": AlertTriangle,
  "cloud-upload-outline": Upload,
  "log-out-outline": LogOut,
  "settings-outline": Settings,
  "create-outline": Edit,
  "eye-outline": Eye,
  "open-outline": ExternalLink,
  "receipt-outline": Receipt,
  "document-text-outline": Receipt,
  "basket-outline": ShoppingBasket,
  "key-outline": KeyRound,
  "people-outline": Users,
  "color-palette-outline": Palette,
  "card-outline": CreditCard,
  "megaphone-outline": Megaphone,
  "images-outline": Images,
  "sparkles-outline": Sparkles,
  "save-outline": Save,
  "download-outline": Download,
  "cash-outline": DollarSign,
  "person-outline": User,
  "home-outline": Home,
  "grid-outline": LayoutGrid,
  "send-outline": Send,
  "image-outline": ImageIcon,
  "cloud-outline": Cloud,
  "cloud-offline-outline": CloudOff,
  "chatbubble-outline": MessageSquare,
};

// Premium, elegant tote / handbag icon rendered inline as an SVG.
// Replaces the generic shopping-bag glyph while keeping the same public API.
function PremiumBagIcon({ size, className, style }: { size: number; className?: string; style?: CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M4.2 8h15.6l-1.1 11.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8L4.2 8Z" />
      <path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2" />
      <path d="M9 12h6" />
    </svg>
  );
}

export function Icon({
  name,
  className,
  style,
  size = 20,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
  size?: number | string;
}) {
  const px = typeof size === "number" ? size : parseInt(String(size), 10) || 20;
  if (name === "bag-outline" || name === "premium-bag") {
    return <PremiumBagIcon size={px} className={className} style={style} />;
  }
  const Cmp = MAP[name] ?? Info;
  return <Cmp size={px} className={className} style={style} strokeWidth={1.75} />;
}