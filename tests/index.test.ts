import { create, insertWithHooks } from "@lyrasearch/lyra";
import t from "tap";
import { afterInsert, LyraWithHighlight, searchWithHighlight, tokenizer } from "../src";

t.test("it should store the position of tokens", t => {
  t.plan(1);

  const schema = {
    text: "string",
  } as const;

  const db = create({ schema, hooks: { afterInsert }, tokenizer }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { text: "hello world" });

  t.same(db.positions[Object.keys(db.docs)[0]], {
    text: { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] },
  });
});

t.test("it should manage nested schemas", t => {
  t.plan(1);

  const schema = {
    other: {
      text: "string",
    },
  } as const;

  const db = create({ schema, hooks: { afterInsert }, tokenizer }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { other: { text: "hello world" } });

  t.same(db.positions[Object.keys(db.docs)[0]], {
    "other.text": { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] },
  });
});

t.test("it shouldn't stem tokens", t => {
  t.plan(1);

  const schema = {
    text: "string",
  } as const;

  const db = create({ schema, hooks: { afterInsert }, tokenizer }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { text: "hello personalization" });

  t.same(db.positions[Object.keys(db.docs)[0]], {
    text: { hello: [{ start: 0, length: 5 }], personalization: [{ start: 6, length: 15 }] },
  });
});

t.test("should retrieve positions", t => {
  t.plan(1);

  const schema = {
    text: "string",
  } as const;

  const db = create({ schema, hooks: { afterInsert }, tokenizer }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { text: "hello world" });

  t.same(searchWithHighlight(db, { term: "hello" })[0].positions, { text: { hello: [{ start: 0, length: 5 }] } });
});
