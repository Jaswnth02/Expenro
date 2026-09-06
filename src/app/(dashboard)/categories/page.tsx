'use client';

import React, { useState, useEffect } from 'react';
import { LocalFinanceStore } from '@/lib/data-service';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import { Category, CategoryType } from '@/types';
import {
  CategoryIcon,
  AVAILABLE_ICONS,
  PRESET_COLORS,
} from '@/components/categories/category-icon';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Tags,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState('#10B981');
  const [icon, setIcon] = useState('Tag');
  const [formError, setFormError] = useState<string | null>(null);

  // Usage counts map (categoryId -> count)
  const [usageCount, setUsageCount] = useState<Record<string, number>>({});

  const loadData = async () => {
    try {
      const [cats, expenses, incomes] = await Promise.all([
        SupabaseFinanceService.getCategories(),
        SupabaseFinanceService.getExpenses(),
        SupabaseFinanceService.getIncomes(),
      ]);
      setCategories(cats);

      // Compute usage count
      const counts: Record<string, number> = {};
      expenses.forEach((e) => {
        if (e.category_id) {
          counts[e.category_id] = (counts[e.category_id] || 0) + 1;
        }
      });
      incomes.forEach((i) => {
        // Incomes match by source or id if matched
        const matched = cats.find(
          (c) => c.type === 'income' && c.name.toLowerCase() === i.source?.toLowerCase()
        );
        if (matched) {
          counts[matched.id] = (counts[matched.id] || 0) + 1;
        }
      });

      setUsageCount(counts);
    } catch {
      const cats = LocalFinanceStore.getCategories();
      setCategories(cats);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const openAddModal = (presetType: CategoryType = 'expense') => {
    setEditingCategory(null);
    setName('');
    setType(presetType);
    setColor(presetType === 'expense' ? '#EF4444' : '#10B981');
    setIcon('Tag');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || '#10B981');
    setIcon(cat.icon || 'Tag');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError('Please enter a category name');
      return;
    }

    // Check duplicate name within the same type
    const duplicate = categories.find(
      (c) =>
        c.name.toLowerCase() === cleanName.toLowerCase() &&
        c.type === type &&
        (!editingCategory || c.id !== editingCategory.id)
    );

    if (duplicate) {
      setFormError(`A ${type} category named "${cleanName}" already exists`);
      return;
    }

    if (editingCategory) {
      await SupabaseFinanceService.updateCategory(editingCategory.id, {
        name: cleanName,
        type,
        color,
        icon,
      });
      showFeedback(`Category "${cleanName}" updated successfully.`);
    } else {
      await SupabaseFinanceService.addCategory({
        user_id: null,
        name: cleanName,
        type,
        color,
        icon,
      });
      showFeedback(`Category "${cleanName}" added and ready in dropdowns!`);
    }

    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteCategory = async (cat: Category) => {
    const count = usageCount[cat.id] || 0;
    const warning =
      count > 0
        ? `"${cat.name}" is currently used in ${count} transaction(s). Are you sure you want to delete it?`
        : `Are you sure you want to delete category "${cat.name}"?`;

    if (confirm(warning)) {
      await SupabaseFinanceService.deleteCategory(cat.id);
      showFeedback(`Category "${cat.name}" removed.`);
      await loadData();
    }
  };

  const handleResetDefaults = async () => {
    if (
      confirm(
        'Reset all categories back to default system presets? Custom categories will be replaced with defaults.'
      )
    ) {
      LocalFinanceStore.resetCategories();
      showFeedback('Categories reset to system defaults.');
      await loadData();
    }
  };

  const filteredCategories = categories.filter((c) => {
    const matchesTab = activeTab === 'all' || c.type === activeTab;
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.icon && c.icon.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const expenseCount = categories.filter((c) => c.type === 'expense').length;
  const incomeCount = categories.filter((c) => c.type === 'income').length;

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Categories
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
              {categories.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Customize expense & income categories. Any added or modified categories appear
            instantly in dropdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            type="button"
            title="Reset to default categories"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            onClick={() => openAddModal('expense')}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto max-w-full sm:max-w-fit shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'expense'
                ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Expenses ({expenseCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'income'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Income ({incomeCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Categories Cards Grid */}
      {filteredCategories.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Tags className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            No categories found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No category matching "${searchQuery}". Try a different search.`
              : 'Click "+ Add Category" to create your first customized category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCategories.map((cat) => {
            const count = usageCount[cat.id] || 0;
            const catColor = cat.color || '#10B981';

            return (
              <div
                key={cat.id}
                className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Category Icon Badge */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${catColor}18`,
                      color: catColor,
                      border: `1px solid ${catColor}30`,
                    }}
                  >
                    <CategoryIcon iconName={cat.icon} className="w-5 h-5" />
                  </div>

                  {/* Name & Details */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {cat.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          cat.type === 'expense'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {cat.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: catColor }}
                        />
                        {catColor}
                      </span>
                      <span>•</span>
                      <span>{count} {count === 1 ? 'record' : 'records'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(cat)}
                    title="Edit category"
                    className="p-2 rounded-xl text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    title="Delete category"
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col pb-safe"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Tags className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scrollable */}
            <form onSubmit={handleFormSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Groceries, Gym, Subscriptions"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* Category Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      type === 'expense'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Expense</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      type === 'income'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Income</span>
                  </button>
                </div>
              </div>

              {/* Color Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                  <span>Theme Color</span>
                  <span className="font-mono text-[11px] text-zinc-400">{color}</span>
                </label>

                {/* Swatches */}
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      aria-label={`Select color ${preset}`}
                      className={`h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        color.toLowerCase() === preset.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-emerald-500 scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset }}
                    >
                      {color.toLowerCase() === preset.toLowerCase() && (
                        <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#10B981"
                    className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Icon Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/30">
                  {AVAILABLE_ICONS.map((iconName) => {
                    const isSelected = icon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setIcon(iconName)}
                        title={iconName}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-2 ring-emerald-500'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <CategoryIcon iconName={iconName} className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Live Preview
                </span>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                        border: `1px solid ${color}35`,
                      }}
                    >
                      <CategoryIcon iconName={icon} className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {name.trim() || 'Category Name'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      type === 'expense'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                    }`}
                  >
                    {type}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
