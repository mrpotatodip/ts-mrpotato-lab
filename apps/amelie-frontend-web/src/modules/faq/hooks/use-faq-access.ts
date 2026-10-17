import { useActiveTenantRole } from "#/modules/tenant";

// -----
// What this role may do on the FAQ screen. Each action
// has its own Power, so a role can be allowed to answer
// questions and still not delete one.
// -----
export function useFaqAccess() {
  const { can } = useActiveTenantRole();
  return {
    canCreateFaq: can("company:faqs:faqs:create"),
    canUpdateFaq: can("company:faqs:faqs:update"),
    canDeleteFaq: can("company:faqs:faqs:delete"),
    canCreateCategory: can("company:faqs:categories:create"),
    canUpdateCategory: can("company:faqs:categories:update"),
    canDeleteCategory: can("company:faqs:categories:delete"),
  };
}
