'use client';

import React from 'react';
import {
  Utensils,
  Car,
  ShoppingBag,
  Film,
  Receipt,
  BookOpen,
  Activity,
  Home,
  Laptop,
  Plane,
  MoreHorizontal,
  Briefcase,
  Award,
  Wallet,
  GraduationCap,
  DollarSign,
  Dumbbell,
  Coffee,
  Gamepad2,
  Gift,
  Heart,
  Sparkles,
  Smartphone,
  Music,
  Tag,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Car,
  ShoppingBag,
  Film,
  Receipt,
  BookOpen,
  Activity,
  Home,
  Laptop,
  Plane,
  MoreHorizontal,
  Briefcase,
  Award,
  Wallet,
  GraduationCap,
  DollarSign,
  Dumbbell,
  Coffee,
  Gamepad2,
  Gift,
  Heart,
  Sparkles,
  Smartphone,
  Music,
  Tag,
};

export const AVAILABLE_ICONS = [
  'Utensils',
  'Car',
  'ShoppingBag',
  'Film',
  'Receipt',
  'BookOpen',
  'Activity',
  'Home',
  'Laptop',
  'Plane',
  'Coffee',
  'Dumbbell',
  'Gamepad2',
  'Gift',
  'Heart',
  'Smartphone',
  'Music',
  'Briefcase',
  'Award',
  'Wallet',
  'GraduationCap',
  'DollarSign',
  'Sparkles',
  'Tag',
  'MoreHorizontal',
];

export const PRESET_COLORS = [
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#6B7280', // Gray
];

interface CategoryIconProps {
  iconName?: string | null;
  className?: string;
  size?: number;
}

export function CategoryIcon({
  iconName,
  className = 'w-4 h-4',
  size,
}: CategoryIconProps) {
  const IconComponent = (iconName && CATEGORY_ICON_MAP[iconName]) || Tag;
  return <IconComponent className={className} size={size} />;
}
