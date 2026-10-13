import { z } from "zod";
import { IMPORT_PDF_TYPE } from "@repo/contracts/amelie";
import { IMPORT_EXTRACTION_FAILED, IMPORT_MODEL } from "#/modules/menu-import/constants";
import { ExtractedMenuSchema } from "#/modules/menu-import/schemas";
import type { MenuExtractor, UploadedFile } from "#/modules/menu-import/types";
import { toDraftRecords } from "./to-draft-records";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

const ResponsesBodySchema = z.object({
  output: z.array(
    z.object({
      type: z.string(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    }),
  ),
});

const INSTRUCTIONS = `\\
You read one page or file of a cafe or restaurant menu and return its content as data.

Rules:
- Copy names, descriptions and prices as printed. Never invent an item, a price or a note.
- Group items under the section heading they sit in. A note that covers a whole section, such as "Substitute gluten-free bread +2", goes in that category's note.
- A price is the number as printed, such as "12" or "6.50". If an item has several sizes with a price each, list them as variants with the size name. If you cannot tell what a price belongs to (a price with no size label, or one price for a whole group), keep the number and say so in reviewNote.
- dietaryTags: use only slugs from the list you are given, and only when the menu says so. Leave dietary markers such as (vegetarian) out of the item name.
- hours: only when opening hours are printed. dayOfWeek is 0 for Sunday to 6 for Saturday, times are 24-hour HH:MM. Otherwise return an empty list.
- profile: only the phone, email, address, website or a one-line description when printed. Otherwise null.
- menuReviewNote: say so if the menu looks old, for example an old date or very low prices. Otherwise null.
- reviewNote: one short sentence about anything you are unsure of in that item, category or day. Otherwise null.`;

const toBase64 = (bytes: ArrayBuffer): string => {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let offset = 0; offset < view.length; offset += 0x8000) {
    binary += String.fromCharCode(...view.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};

const toFileContent = (file: UploadedFile) =>
  file.contentType === IMPORT_PDF_TYPE
    ? { type: "input_file", filename: file.name, file_data: `data:${file.contentType};base64,${toBase64(file.bytes)}` }
    : { type: "input_image", image_url: `data:${file.contentType};base64,${toBase64(file.bytes)}` };

// -----
// One file in, drafts out, through OpenAI's Responses
// API with a strict JSON schema. A failure throws, and
// the Import is marked failed.
// -----
export const createOpenAiMenuExtractor =
  (apiKey: string): MenuExtractor =>
  async (file, dietaryTagSlugs) => {
    const { $schema: _schema, ...schema } = z.toJSONSchema(ExtractedMenuSchema);
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMPORT_MODEL,
        instructions: INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `Dietary tag slugs you may use: ${dietaryTagSlugs.join(", ") || "none"}.` },
              toFileContent(file),
            ],
          },
        ],
        text: { format: { type: "json_schema", name: "menu", strict: true, schema } },
      }),
    });
    if (!response.ok) throw new Error(`${IMPORT_EXTRACTION_FAILED}: the model answered ${response.status}`);
    const body = ResponsesBodySchema.parse(await response.json());
    const text = body.output
      .flatMap((item) => (item.type === "message" ? (item.content ?? []) : []))
      .find((part) => part.type === "output_text")?.text;
    if (!text) throw new Error(`${IMPORT_EXTRACTION_FAILED}: the model sent no answer`);
    return toDraftRecords(ExtractedMenuSchema.parse(JSON.parse(text)), dietaryTagSlugs);
  };
