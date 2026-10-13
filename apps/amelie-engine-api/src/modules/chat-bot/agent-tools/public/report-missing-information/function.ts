import type {
  ReportMissingInformationInput,
  ReportMissingInformationResult,
} from "./schema";

// -----
// Nothing to look up: the saved call is the
// record the Unanswered list reads.
// -----
export const reportMissingInformation = ({
  topic,
}: ReportMissingInformationInput): ReportMissingInformationResult => ({
  topic: topic.trim().toLowerCase(),
});
