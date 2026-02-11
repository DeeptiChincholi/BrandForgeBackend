import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  setupAndLink
} from "./chunk-RPXSHEGV.js";
import {
  getCommandName,
  getLinkedProject,
  param
} from "./chunk-62EDLXXJ.js";
import {
  output_manager_default
} from "./chunk-6TPHDHH6.js";

// src/util/link/ensure-link.ts
async function ensureLink(commandName, client, cwd, opts = {}) {
  let { link } = opts;
  if (!link) {
    link = await getLinkedProject(client, cwd);
    opts.link = link;
  }
  if (link.status === "linked" && opts.forceDelete || link.status === "not_linked") {
    link = await setupAndLink(client, cwd, opts);
    if (link.status === "not_linked") {
      return 0;
    }
  }
  if (link.status === "error") {
    if (link.reason === "HEADLESS") {
      output_manager_default.error(
        `Command ${getCommandName(
          commandName
        )} requires confirmation. Use option ${param("--yes")} to confirm.`
      );
    }
    return link.exitCode;
  }
  return link;
}

export {
  ensureLink
};
