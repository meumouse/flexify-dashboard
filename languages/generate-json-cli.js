import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import gettextParser from "gettext-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEXT_DOMAIN = "flexify-dashboard";
const DEFAULT_PLURAL_FORMS = "nplurals=2; plural=(n != 1);";

// `wp_set_script_translations()` looks for `{domain}-{locale}-{handle}.json` and falls back to
// `{domain}-{locale}-{domain}.json`, so every .po is written under both names.
const SCRIPT_HANDLES = [TEXT_DOMAIN, `${TEXT_DOMAIN}-app-js`];

/**
 * Resolve which .po files should be converted, honouring `--lang pt_BR`.
 */
function getPoFiles() {
  const args = process.argv.slice(2);
  const langFlagIndex = args.findIndex((arg) => arg === "--lang" || arg === "-l");
  const inlineLangArg = args.find((arg) => arg.startsWith("--lang="));

  let selectedLangCode = null;

  if (langFlagIndex !== -1) {
    selectedLangCode = args[langFlagIndex + 1] || null;
  } else if (inlineLangArg) {
    selectedLangCode = inlineLangArg.split("=")[1] || null;
  } else if (args[0] && !args[0].startsWith("-")) {
    selectedLangCode = args[0];
  }

  if (selectedLangCode) {
    return [path.join(__dirname, `${TEXT_DOMAIN}-${selectedLangCode}.po`)];
  }

  return fs
    .readdirSync(__dirname)
    .filter((file) => file.endsWith(".po"))
    .map((file) => path.join(__dirname, file));
}

/**
 * Build the Jed 1.x payload `@wordpress/i18n` expects out of a parsed .po file.
 */
function buildLocaleData(parsed, locale) {
  const pluralForms = parsed.headers["plural-forms"] || parsed.headers["Plural-Forms"] || DEFAULT_PLURAL_FORMS;

  const messages = {
    "": {
      domain: TEXT_DOMAIN,
      lang: locale,
      "plural-forms": pluralForms,
    },
  };

  let translated = 0;

  for (const context of Object.keys(parsed.translations)) {
    for (const msgid of Object.keys(parsed.translations[context])) {
      if (!msgid) {
        continue;
      }

      const entry = parsed.translations[context][msgid];
      const values = (entry.msgstr || []).filter((value) => value !== "");

      if (values.length === 0) {
        continue;
      }

      // Contexts are keyed with the Jed separator, plurals keep one entry per form.
      messages[context ? `${context}\u0004${msgid}` : msgid] = entry.msgstr;
      translated += 1;
    }
  }

  const sorted = { "": messages[""] };

  for (const key of Object.keys(messages).sort()) {
    if (key !== "") {
      sorted[key] = messages[key];
    }
  }

  return { messages: sorted, translated };
}

const poFiles = getPoFiles();

if (poFiles.length === 0) {
  console.error("No .po files found.");
  process.exit(1);
}

for (const poFile of poFiles) {
  if (!fs.existsSync(poFile)) {
    console.error(`File not found: ${path.basename(poFile)}`);
    process.exitCode = 1;
    continue;
  }

  const locale = path.basename(poFile, ".po").replace(`${TEXT_DOMAIN}-`, "");
  const parsed = gettextParser.po.parse(fs.readFileSync(poFile));
  const { messages, translated } = buildLocaleData(parsed, locale);

  const payload = {
    domain: TEXT_DOMAIN,
    locale_data: {
      [TEXT_DOMAIN]: messages,
    },
  };

  for (const handle of SCRIPT_HANDLES) {
    const outputFile = path.join(__dirname, `${TEXT_DOMAIN}-${locale}-${handle}.json`);
    fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`Written: ${path.basename(outputFile)}`);
  }

  console.log(`  ${locale}: ${translated} translated entries.`);
}
