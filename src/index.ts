import { Configuration, create, Lyra, PropertiesSchema, tokenize } from "@lyrasearch/lyra";
import { ResolveSchema } from "@lyrasearch/lyra/dist/esm/src/types";

export type Position = {
  start: number;
  length: number;
};

export type LyraWithHighlight<S extends PropertiesSchema> = Lyra<S> & {
  positions: { [id: string]: { [property: string]: { [token: string]: Position[]}}};
};

export function createWithHighlight<S extends PropertiesSchema>(properties: Configuration<S>): LyraWithHighlight<S> {
  const lyra = create(properties);
  return Object.assign(lyra, { positions: {} });
}

export function afterInsert<S extends PropertiesSchema>(this: Lyra<S>, id: string) {
  const lyra = this as LyraWithHighlight<S>;
  recursivePositionInsertion(lyra, lyra.docs[id]!, id);
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
    const tokens = tokenize(text);
    tokens.forEach(token => {
      if (lyra.positions[id][propName][token] === undefined) {
        lyra.positions[id][propName][token] = [];
      }
      const re = new RegExp(`${token}\\w*`, "ig");
      let array;
      while ((array = re.exec(text)) !== null) {
        const start = array.index;
        const length = re.lastIndex - start;
        if (tokenize(array[0])[0] === token) {
          lyra.positions[id][propName][token].push({ start, length });
        }
      }
    });
  }
}
