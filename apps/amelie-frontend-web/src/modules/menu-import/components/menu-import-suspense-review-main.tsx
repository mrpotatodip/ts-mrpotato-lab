import { Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import type { ImportDraft } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { CountrySwitcher, useSuspenseCountrySelection } from "#/modules/country";
import { useSuspenseDashboardScope } from "#/modules/dashboard/hooks/use-dashboard-scope";
import { LocationSwitcher, useSuspenseLocationSelection } from "#/modules/location";
import { PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { KIND_TITLE, MODE_LABEL } from "../constants";
import { useMenuImportActions, useSuspenseMenuImport } from "../hooks";
import { publishModesFor, usableMode, type PublishMode } from "../utils";
import { MenuImportDraft } from "./menu-import-draft";
import { MenuImportReviewSkeleton } from "./menu-import-review-skeleton";

type MenuImportSuspenseReviewMainProps = {
  importId: string;
};

const KINDS: ImportDraft["kind"][] = ["menu_category", "menu_item", "business_hours", "business_profile"];

// -----
// Review one menu upload, then publish. The back link and
// header show at once; the rest waits behind the skeleton.
// -----
export function MenuImportSuspenseReviewMain({ importId }: MenuImportSuspenseReviewMainProps) {
  return (
    <>
      <Link to="/imports" className="text-muted-foreground hover:text-foreground -mb-4 text-sm">
        ← All menu uploads
      </Link>
      <PageHeader title="Review menu import" description="Check what Amelie read, fix or discard anything wrong, then publish." />
      <Suspense fallback={<MenuImportReviewSkeleton />}>
        <MenuImportReviewView importId={importId} />
      </Suspense>
    </>
  );
}

// -----
// Review one Import: drafts by kind and file on the right,
// approve and publish on the left. "Replace" is the default mode,
// unless the cafe has several Countries: then only Add is offered.
// -----
function MenuImportReviewView({ importId }: MenuImportSuspenseReviewMainProps) {
  const { data } = useSuspenseMenuImport(importId);
  const { approveAll, publish } = useMenuImportActions();
  const { canEdit } = useActiveTenantRole();
  const dashboard = useSuspenseDashboardScope();
  const locationSelection = useSuspenseLocationSelection();
  const countrySelection = useSuspenseCountrySelection();
  const [countryId, setCountryId] = useState(dashboard.countryId);
  const [locationId, setLocationId] = useState(dashboard.locationId);
  const [chosenMode, setMode] = useState<PublishMode>("replace");
  const mode = usableMode(chosenMode, countrySelection.multiple);

  if (data.status === "running") {
    return (
      <PageCard title="Review">
        <p className="text-muted-foreground text-sm">Amelie is reading your menu...</p>
      </PageCard>
    );
  }
  if (data.status === "failed") {
    return (
      <PageCard title="Review">
        <p className="text-destructive text-sm">{data.error ?? "The menu could not be read."}</p>
      </PageCard>
    );
  }

  const published = publish.data;
  const files = [...new Set(data.drafts.map((draft) => draft.sourceFile))];
  const fileNames = data.files.map((file) => file.name).join(", ");
  const canPublish = canEdit && !data.publishedAt;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="flex flex-col gap-8 lg:sticky lg:top-20">
        {canPublish ? (
          <PageCard title="Publish" description={fileNames}>
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                {data.pendingCount} to review, {data.approvedCount} approved, {data.discardedCount} discarded.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.pendingCount === 0 || approveAll.isPending}
                  onClick={() => approveAll.mutate({ data: { importId } })}
                >
                  Approve all
                </Button>
              </div>
              <Select value={mode} onValueChange={(value) => setMode(value === "add" ? "add" : "replace")}>
                <SelectTrigger aria-label="When you publish the menu" className="w-full">
                  <SelectValue>{MODE_LABEL[mode]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {publishModesFor(countrySelection.multiple).map((option) => (
                    <SelectItem key={option} value={option}>
                      {MODE_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CountrySwitcher
                countries={countrySelection.countries}
                value={countryId}
                onChange={setCountryId}
                label="Menu prices are in"
              />
              <LocationSwitcher
                locations={locationSelection.locations}
                value={locationId}
                onChange={setLocationId}
                label="Hours and contact details go to"
              />
              {publish.isError ? <p className="text-xs text-destructive">{publish.error.message}</p> : null}
              {approveAll.isError ? <p className="text-xs text-destructive">{approveAll.error.message}</p> : null}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={data.approvedCount === 0 || publish.isPending}
                  onClick={() => {
                    const warning = mode === "replace" ? "Publish and replace your current menu?" : "Publish and add to your menu?";
                    if (window.confirm(warning))
                      publish.mutate({
                        data: { importId, mode, locationId, countryId },
                      });
                  }}
                >
                  {publish.isPending ? "Publishing..." : "Publish approved"}
                </Button>
              </div>
            </div>
          </PageCard>
        ) : (
          <PageCard title={data.publishedAt ? "Published" : "Review"} description={fileNames}>
            <p className="text-sm">
              {data.publishedAt ? "This menu is live." : "Only an owner or manager can publish this menu."}
            </p>
            {published ? (
              <p className="stat-label mt-2">
                {published.menuCategories} categories, {published.menuItems} items, {published.businessHours} days of hours,{" "}
                {published.profileFieldsFilled} contact fields.
              </p>
            ) : null}
          </PageCard>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {files.map((file) => (
          <div key={file} className="flex flex-col gap-8">
            {files.length > 1 ? <h3 className="text-lg font-semibold">{file}</h3> : null}
            {KINDS.map((kind) => {
              const drafts = data.drafts.filter((draft) => draft.sourceFile === file && draft.kind === kind);
              if (drafts.length === 0) return null;
              return (
                <PageCard
                  key={kind}
                  title={KIND_TITLE[kind]}
                  description={`${drafts.length} ${drafts.length === 1 ? "draft" : "drafts"}`}
                  contentClassName="p-0"
                >
                  <ul className="divide-y">
                    {drafts.map((draft) => (
                      <MenuImportDraft
                        key={`${draft.id}:${draft.status}:${JSON.stringify(draft.data)}`}
                        importId={importId}
                        draft={draft}
                        canEdit={canPublish}
                        currency={countrySelection.selected?.currency}
                      />
                    ))}
                  </ul>
                </PageCard>
              );
            })}
          </div>
        ))}
        {data.drafts.length === 0 ? (
          <PageCard title="Drafts">
            <p className="text-muted-foreground text-sm">Nothing was found in this file.</p>
          </PageCard>
        ) : null}
      </div>
    </div>
  );
}
