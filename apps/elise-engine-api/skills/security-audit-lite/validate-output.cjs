#!/usr/bin/env node
"use strict";
// Checks the files the lite skill writes: findings.json, and recheck.json when the
// run was given prior-findings.json. Usage:
//   node validate-output.cjs <output dir> [<prior-findings.json>]
// Prints one line per problem and exits 1, or prints "ok" and exits 0.
const fs = require("node:fs");
const path = require("node:path");

const STATUSES = ["confirmed", "needs_validation"];
const SEVERITIES = ["critical", "high", "medium", "low", "informational"];
const RESULTS = ["not_found", "cannot_tell"];

const isText = (value) => typeof value === "string" && value.trim() !== "";

const checkFindings = (findings, errors) => {
  const ids = new Set();
  findings.forEach((item, index) => {
    const at = `findings.json[${index}]`;
    if (typeof item !== "object" || item === null || Array.isArray(item)) return errors.push(`${at}: must be an object`);
    if (!isText(item.id)) errors.push(`${at}: id must be a non-empty string`);
    else if (ids.has(item.id)) errors.push(`${at}: id ${item.id} is used twice`);
    else ids.add(item.id);
    if (!STATUSES.includes(item.status)) errors.push(`${at}: status must be one of ${STATUSES.join(", ")}`);
    if (!isText(item.title)) errors.push(`${at}: title must be a non-empty string`);
    if (!isText(item.class)) errors.push(`${at}: class must be a non-empty string`);
    if (!Array.isArray(item.location)) errors.push(`${at}: location must be an array`);
    else if (item.location.some((place) => !place || !isText(place.file))) errors.push(`${at}: every location needs a file`);
    if (item.status === "confirmed" && !SEVERITIES.includes(item.severity)) errors.push(`${at}: a confirmed finding needs a severity (${SEVERITIES.join(", ")})`);
    if (item.status === "needs_validation" && item.severity != null) errors.push(`${at}: a needs_validation finding has severity null`);
    if (item.priorId != null && !isText(item.priorId)) errors.push(`${at}: priorId must be a non-empty string`);
  });
};

// -----
// Every prior is answered exactly once: kept in findings.json with its priorId,
// or listed in recheck.json. A prior with no answer stays open and unchecked,
// which is the same as the agent not having looked.
// -----
const checkPriors = (findings, recheck, priors, errors) => {
  const known = new Set(priors.map((prior) => prior.priorId));
  const carried = new Map();
  findings.forEach((item, index) => {
    if (!item || item.priorId == null) return;
    if (!known.has(item.priorId)) errors.push(`findings.json[${index}]: priorId ${item.priorId} is not in prior-findings.json`);
    else if (carried.has(item.priorId)) errors.push(`findings.json[${index}]: priorId ${item.priorId} is used twice`);
    else carried.set(item.priorId, index);
  });

  const answered = new Set();
  recheck.forEach((entry, index) => {
    const at = `recheck.json[${index}]`;
    if (!entry || !isText(entry.priorId)) return errors.push(`${at}: priorId must be a non-empty string`);
    if (!RESULTS.includes(entry.result)) errors.push(`${at}: result must be one of ${RESULTS.join(", ")}`);
    if (!known.has(entry.priorId)) errors.push(`${at}: priorId ${entry.priorId} is not in prior-findings.json`);
    if (answered.has(entry.priorId)) errors.push(`${at}: priorId ${entry.priorId} is listed twice`);
    if (carried.has(entry.priorId)) errors.push(`${at}: priorId ${entry.priorId} is also kept in findings.json`);
    answered.add(entry.priorId);
  });

  for (const priorId of known) {
    if (!carried.has(priorId) && !answered.has(priorId)) errors.push(`prior ${priorId} has no answer: keep it in findings.json with its priorId, or list it in recheck.json`);
  }
};

const validateOutput = ({ findings, recheck, priors }) => {
  const errors = [];
  if (!Array.isArray(findings)) return ["findings.json must be a JSON array"];
  checkFindings(findings, errors);
  if (priors.length > 0 && !Array.isArray(recheck)) return [...errors, "recheck.json must exist and be a JSON array when prior-findings.json is given"];
  if (priors.length === 0 && findings.some((item) => item && item.priorId != null)) errors.push("no prior-findings.json was given, so no finding has a priorId");
  if (Array.isArray(recheck)) checkPriors(findings, recheck, priors, errors);
  return errors;
};

const readJson = (file) => {
  if (!fs.existsSync(file)) return { missing: true };
  try {
    return { value: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch (error) {
    return { invalid: `${path.basename(file)} is not valid JSON: ${error.message}` };
  }
};

const main = () => {
  const [outDir, priorFile] = process.argv.slice(2);
  if (!outDir) {
    console.error("usage: node validate-output.cjs <output dir> [<prior-findings.json>]");
    return 2;
  }
  const read = { findings: readJson(path.join(outDir, "findings.json")), recheck: readJson(path.join(outDir, "recheck.json")) };
  const prior = priorFile ? readJson(priorFile) : { missing: true };
  const errors = [];
  if (read.findings.missing) errors.push("findings.json is missing");
  if (read.findings.invalid) errors.push(read.findings.invalid);
  if (read.recheck.invalid) errors.push(read.recheck.invalid);
  if (prior.invalid) errors.push(prior.invalid);
  const priors = Array.isArray(prior.value) ? prior.value : [];
  if (priors.length > 0 && read.recheck.missing) errors.push("recheck.json is missing");
  if (read.findings.value !== undefined) {
    errors.push(...validateOutput({ findings: read.findings.value, recheck: read.recheck.value ?? (priors.length > 0 ? null : []), priors }));
  }
  if (errors.length === 0) {
    console.log("ok");
    return 0;
  }
  console.error(errors.join("\n"));
  return 1;
};

if (require.main === module) process.exit(main());
module.exports = { validateOutput };
