import { Lyra, PropertiesSchema, RetrievedDoc, search, SearchParams, tokenize } from "@lyrasearch/lyra";
import { normalizationCache } from "@lyrasearch/lyra/dist/cjs/src/tokenizer";
import { Language } from "@lyrasearch/lyra/dist/cjs/src/tokenizer/languages";
import { ResolveSchema } from "@lyrasearch/lyra/dist/cjs/src/types";

export type Position = {
  start: number;
  length: number;
};

export type LyraWithHighlight<S extends PropertiesSchema> = Lyra<S> & {
  positions: { [id: string]: { [property: string]: { [token: string]: Position[] } } };
};

export type SearchResultWithHighlight<S extends PropertiesSchema> = RetrievedDoc<S> & {
  positions: { [property: string]: { [token: string]: Position[] } };
};

export function afterInsert<S extends PropertiesSchema>(this: Lyra<S> | LyraWithHighlight<S>, id: string) {
  if (!("positions" in this)) {
    Object.assign(this, { positions: {} });
  }
  recursivePositionInsertion(this as LyraWithHighlight<S>, this.docs[id]!, id);
}

const wordRegEx = /[\p{L}0-9_'-]+/gimu;

function recursivePositionInsertion<S extends PropertiesSchema>(
  lyra: LyraWithHighlight<S>,
  doc: ResolveSchema<S>,
  id: string,
  prefix = "",
  schema: PropertiesSchema = lyra.schema,
) {
  lyra.positions[id] = Object.create(null, {});
  for (const key of Object.keys(doc)) {
    const isNested = typeof doc[key] === "object";
    const isSchemaNested = typeof schema[key] == "object";
    const propName = `${prefix}${key}`;
    if (isNested && key in schema && isSchemaNested) {
      recursivePositionInsertion(
        lyra,
        doc[key] as ResolveSchema<S>,
        id,
        propName + ".",
        schema[key] as PropertiesSchema,
      );
    }
    if (!(typeof doc[key] === "string" && key in schema && !isSchemaNested)) {
      continue;
    }
    lyra.positions[id][propName] = Object.create(null, {});
    const text = doc[key] as string;
    let regExResult;
    while ((regExResult = wordRegEx.exec(text)) !== null) {
      const word = regExResult[0].toLowerCase();
      const key = `${lyra.defaultLanguage}:${word}`;
      let token: string;
      if (normalizationCache.has(key)) {
        token = normalizationCache.get(key)!;
        /* c8 ignore next 4 */
      } else {
        [token] = tokenize(word);
        normalizationCache.set(key, token);
      }
      if (!Array.isArray(lyra.positions[id][propName][token])) {
        lyra.positions[id][propName][token] = [];
      }
      const start = regExResult.index;
      const length = regExResult[0].length;
      lyra.positions[id][propName][token].push({ start, length });
    }
  }
}

export function searchWithHighlight<S extends PropertiesSchema>(
  lyra: LyraWithHighlight<S>,
  params: SearchParams<S>,
  language?: Language,
): SearchResultWithHighlight<S>[] {
  const result = search(lyra, params, language);
  const queryTokens = tokenize(params.term);
  return result.hits.map(hit =>
    Object.assign(hit, {
      positions: Object.fromEntries(
        Object.entries(lyra.positions[hit.id]).map(([propName, tokens]) => [
          propName,
          Object.fromEntries(
            Object.entries(tokens).filter(([token]) => queryTokens.find(queryToken => token.startsWith(queryToken))),
          ),
        ]),
      ),
    }),
  );
}
