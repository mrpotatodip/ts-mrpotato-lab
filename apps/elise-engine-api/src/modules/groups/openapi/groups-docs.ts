import { describeRoute } from "hono-openapi";
import { GroupDeletedSchema, GroupListSchema, GroupMemberSchema, GroupSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

const SESSION = '  -H "authorization: Bearer $SESSION_TOKEN" \\';
const ACCOUNT = `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`;
const GROUP_ID = "9b2f6c1e-3a4d-4e5f-8a7b-1c2d3e4f5a6b";
const PARTY_ID = "3f2a9c1e-7b64-4d0a-8e5f-1c2d3e4f5a6b";
const CHECK = "The Worker checks the session and that the login's Role in the account named by `x-account-id` holds the Power for this action: `company:team:groups:` then `read`, `create`, `update` (rename, add or remove a member) or `delete`.";

export const listGroupsDoc = describeRoute({
  tags: ["groups"],
  security: SERVICE_SECURITY,
  summary: "List the groups",
  description: routeText({
    context: "A Group is a named set of people in one account, for example `Backend`. It grants nothing yet: it only groups people.",
    steps: [CHECK, "The Worker returns every Group of the account with the Party IDs of its members."],
    example: ["List the groups:", bash(`curl ${EXAMPLE_BASE_URL}/groups \\`, SESSION, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The groups.", envelope(GroupListSchema)), ...errorResponses(400, 401, 403) },
});

export const createGroupDoc = describeRoute({
  tags: ["groups"],
  security: SERVICE_SECURITY,
  summary: "Make a group",
  description: routeText({
    context: "An admin makes a Group. Names are unique inside the account, ignoring case, and one account can have 100 groups.",
    steps: [CHECK, "The Worker refuses a name that is taken (409) or the 101st group (409).", "The Worker saves the Group and writes an audit row."],
    example: [
      "Make the Backend group:",
      bash(`curl -X POST ${EXAMPLE_BASE_URL}/groups \\`, SESSION, ACCOUNT + " \\", '  -H "Content-Type: application/json" \\', `  -d '{"name":"Backend"}'`),
      json(`{ "data": { "id": "${GROUP_ID}", "name": "Backend", "memberIds": [], "createdAt": "2026-11-08T09:00:00.000Z" }, "error": null }`),
    ],
  }),
  responses: { 201: jsonResponse("The new group.", envelope(GroupSchema)), ...errorResponses(400, 401, 403, 409) },
});

export const renameGroupDoc = describeRoute({
  tags: ["groups"],
  security: SERVICE_SECURITY,
  summary: "Rename a group",
  description: routeText({
    context: "An admin renames a Group. The same name rule applies.",
    steps: [CHECK, "The Worker renames the Group, or answers 404 if it is not in the account, or 409 if the name is taken.", "The Worker writes an audit row."],
    example: ["Rename it:", bash(`curl -X PATCH ${EXAMPLE_BASE_URL}/groups/${GROUP_ID} \\`, SESSION, ACCOUNT + " \\", '  -H "Content-Type: application/json" \\', `  -d '{"name":"Platform"}'`)],
  }),
  responses: { 200: jsonResponse("The renamed group.", envelope(GroupSchema)), ...errorResponses(400, 401, 403, 404, 409) },
});

export const deleteGroupDoc = describeRoute({
  tags: ["groups"],
  security: SERVICE_SECURITY,
  summary: "Delete a group",
  description: routeText({
    context: "An admin deletes a Group. Its memberships go with it; the people stay in the account.",
    steps: [CHECK, "The Worker deletes the Group and its memberships, or answers 404.", "The Worker writes an audit row."],
    example: ["Delete it:", bash(`curl -X DELETE ${EXAMPLE_BASE_URL}/groups/${GROUP_ID} \\`, SESSION, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The ID of the deleted group.", envelope(GroupDeletedSchema)), ...errorResponses(400, 401, 403, 404) },
});

export const addGroupMemberDoc = describeRoute({
  tags: ["groups"],
  security: SERVICE_SECURITY,
  summary: "Put a person in a group",
  description: routeText({
    context: "An admin puts a member of the account in a Group. Doing it twice changes nothing. A group holds up to 500 people.",
    steps: [CHECK, "The Worker answers 404 if the Group is not in the account or the person holds no Role there.", "The Worker adds the person and writes an audit row."],
    example: ["Add a person:", bash(`curl -X PUT ${EXAMPLE_BASE_URL}/groups/${GROUP_ID}/members/${PARTY_ID} \\`, SESSION, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The group and the person.", envelope(GroupMemberSchema)), ...errorResponses(400, 401, 403, 404, 409) },
});

export const removeGroupMemberDoc = describeRoute({
  tags: ["groups"],
  security: SERVICE_SECURITY,
  summary: "Take a person out of a group",
  description: routeText({
    context: "An admin takes a person out of a Group. They stay in the account.",
    steps: [CHECK, "The Worker answers 404 if the Group is not in the account or the person is not in it.", "The Worker removes them and writes an audit row."],
    example: ["Remove a person:", bash(`curl -X DELETE ${EXAMPLE_BASE_URL}/groups/${GROUP_ID}/members/${PARTY_ID} \\`, SESSION, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The group and the person.", envelope(GroupMemberSchema)), ...errorResponses(400, 401, 403, 404) },
});
