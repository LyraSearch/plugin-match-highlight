import {
  defaultTokenizerConfig,
  Lyra,
  PropertiesSchema,
  RetrievedDoc,
  search,
  SearchParams,
  tokenize
} from "@lyrasearch/lyra";
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

// export function createWithHighlight<S extends PropertiesSchema>(properties: Configuration<S>): LyraWithHighlight<S> {
//   const lyra = create(properties);
//   return Object.assign(lyra, { positions: {} });
// }

export function afterInsert<S extends PropertiesSchema>(this: Lyra<S> | LyraWithHighlight<S>, id: string) {
  if (!("positions" in this)) {
    Object.assign(this, { positions: {} });
  }
  recursivePositionInsertion(this as LyraWithHighlight<S>, this.docs[id]!, id);
}

function recursivePositionInsertion<S extends PropertiesSchema>(
  lyra: LyraWithHighlight<S>,
  doc: ResolveSchema<S>,
  id: string,
  prefix = "",
  schema: PropertiesSchema = lyra.schema,
) {
  lyra.positions[id] = {};
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
    lyra.positions[id][propName] = {};
    const text = doc[key] as string;
    const tokens = tokenizeWithoutStemming(text);
    tokens.forEach(token => {
      if (lyra.positions[id][propName][token] === undefined) {
        lyra.positions[id][propName][token] = [];
      }
      const re = new RegExp(`${token}\\w*`, "ig");
      let array;
      while ((array = re.exec(text)) !== null) {
        const start = array.index;
        const length = re.lastIndex - start;
        if (tokenizeWithoutStemming(array[0])[0] === token) {
          lyra.positions[id][propName][token].push({ start, length });
        }
      }
    });
  }
}

export function searchWithHighlight<S extends PropertiesSchema>(
  lyra: LyraWithHighlight<S>,
  params: SearchParams<S>,
  language?: Language,
): SearchResultWithHighlight<S>[] {
  const result = search(lyra, params, language);
  const queryTokens = tokenizeWithoutStemming(params.term);
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

function tokenizeWithoutStemming(text: string, language: Language = "english") {
  return tokenize(text, language, false, tokenizer);
}

export const tokenizer = { ...defaultTokenizerConfig("english"), enableStemming: false };
