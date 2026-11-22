"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { queryKeys } from "@/lib/queryKeys";

export function useSystemSettingsQuery(options: { refetchInterval?: number | false } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.settings.current(user?.id ?? "anonymous"),
    queryFn: () => endpoints.settings.getSystemSettings(),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    refetchInterval: options.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });
}

export function useLowStockCountQuery() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: queryKeys.lowStock.current(user?.id ?? "anonymous"),
    queryFn: () => endpoints.rawMaterials.getLowStockCount(),
    enabled: Boolean(user && isAdmin),
    staleTime: 45_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.root }),
    [queryClient],
  );
}

export function useInvalidateLowStockCount() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.lowStock.root }),
    [queryClient],
  );
}

const CATALOGUE_STALE_TIME = 8 * 60_000;

export function fetchCatalogueQuery<T>(client: QueryClient, key: readonly unknown[], queryFn: () => Promise<T>, staleTime = CATALOGUE_STALE_TIME) {
  return client.fetchQuery({ queryKey: key, queryFn, staleTime });
}

export function useBowlsCatalogueQuery(params: {
  page: number; size: number; search?: string; sort?: string; mealCategoryUlid?: string;
  bowlCategoryUlid?: string; bowlType?: string; code?: string; createdById?: number;
  mealCategoryId?: number; bowlCategoryId?: number;
}) {
  const { user } = useAuth();
  const values = [params.page, params.size, params.search ?? "", params.sort ?? "", params.mealCategoryUlid ?? "", params.bowlCategoryUlid ?? "", params.bowlType ?? "", params.code ?? "", params.createdById ?? null, params.mealCategoryId ?? null, params.bowlCategoryId ?? null] as const;
  return useQuery({
    queryKey: queryKeys.bowlCatalogue.list(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.bowls.getBowls(params.page, params.size, params.search, params.sort, params.mealCategoryUlid, params.bowlCategoryUlid, params.bowlType, params.code, params.createdById, params.mealCategoryId, params.bowlCategoryId),
    enabled: Boolean(user), staleTime: CATALOGUE_STALE_TIME,
  });
}

export function useBowlCategoriesQuery(params: { page: number; size: number; search?: string; sort?: string }) {
  const { user } = useAuth();
  const values = [params.page, params.size, params.search ?? "", params.sort ?? ""] as const;
  return useQuery({
    queryKey: queryKeys.bowlCatalogue.categories(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.bowlCategories.getBowlCategories(params.page, params.size, params.search, params.sort),
    enabled: Boolean(user), staleTime: CATALOGUE_STALE_TIME,
  });
}

export function useIngredientsCatalogueQuery(params: { page: number; size: number; search?: string; sort?: string }) {
  const { user } = useAuth();
  const values = [params.page, params.size, params.search ?? "", params.sort ?? ""] as const;
  return useQuery({
    queryKey: queryKeys.ingredientCatalogue.list(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.ingredients.getIngredients(params.page, params.size, params.search, params.sort),
    enabled: Boolean(user), staleTime: CATALOGUE_STALE_TIME,
  });
}

// Raw material results include stock levels, so keep their cache freshness short.
export function useRawMaterialsCatalogueQuery(params: { page: number; size: number; search?: string; stockout?: boolean; sort?: string }) {
  const { user } = useAuth();
  const values = [params.page, params.size, params.search ?? "", Boolean(params.stockout), params.sort ?? ""] as const;
  return useQuery({
    queryKey: queryKeys.rawMaterials.list(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.rawMaterials.getRawMaterials(params.page, params.size, params.search, params.stockout, params.sort),
    enabled: Boolean(user), staleTime: 30_000,
  });
}

export function usePackagingCatalogueQuery(params: { page: number; size: number; search?: string; sort?: string }) {
  const { user } = useAuth();
  const values = [params.page, params.size, params.search ?? "", params.sort ?? ""] as const;
  return useQuery({
    queryKey: queryKeys.packaging.list(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.packaging.getBundles(params.page, params.size, params.search, params.sort),
    enabled: Boolean(user), staleTime: CATALOGUE_STALE_TIME,
  });
}

export function usePackagingComponentsCatalogueQuery(params: { page: number; size: number; search?: string; sort?: string; stockStatus?: string; excludeChildren?: boolean }) {
  const { user } = useAuth();
  const values = [params.page, params.size, params.search ?? "", params.sort ?? "", params.stockStatus ?? "", Boolean(params.excludeChildren)] as const;
  return useQuery({
    queryKey: queryKeys.packaging.components(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.packagingComponents.getComponents(params.page, params.size, params.search, params.sort, params.stockStatus, params.excludeChildren),
    enabled: Boolean(user), staleTime: 30_000,
  });
}

export function useMealCategoriesCatalogueQuery(params: { page: number; size: number; search?: string; sort?: string }) {
  const { user } = useAuth();
  const values = [params.page, params.size, params.search ?? "", params.sort ?? ""] as const;
  return useQuery({
    queryKey: queryKeys.mealCategories.list(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.mealCategories.getMealCategories(params.page, params.size, params.search, params.sort),
    enabled: Boolean(user), staleTime: CATALOGUE_STALE_TIME,
  });
}

export function usePlanTiersCatalogueQuery(params: Record<string, string | number | boolean | undefined> = {}) {
  const { user } = useAuth();
  const values = Object.keys(params).sort().map((key) => [key, params[key]] as const);
  return useQuery({
    queryKey: queryKeys.planTiers.list(user?.id ?? "anonymous", values),
    queryFn: () => endpoints.planTiers.list(params),
    enabled: Boolean(user), staleTime: CATALOGUE_STALE_TIME,
  });
}

export function useInvalidateCatalogue(key: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [queryClient, key]);
}
