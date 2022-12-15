import { create, insertWithHooks } from "@lyrasearch/lyra";
import t from "tap";
import { afterInsert, LyraWithHighlight, searchWithHighlight } from "../src";

t.test("it should store the position of tokens", async t => {
  const schema = {
    text: "string",
  } as const;

  const db = create({ schema, hooks: { afterInsert } }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { text: "hello world" });

  t.same(db.positions[Object.keys(db.docs)[0]], {
    text: { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] },
  });
});

t.test("it should manage nested schemas", async t => {
  const schema = {
    other: {
      text: "string",
    },
  } as const;

  const db = create({ schema, hooks: { afterInsert } }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { other: { text: "hello world" } });

  t.same(db.positions[Object.keys(db.docs)[0]], {
    "other.text": { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] },
  });
});

t.test("it shouldn't stem tokens", async t => {
  const schema = {
    text: "string",
  } as const;

  const db = create({ schema, hooks: { afterInsert } }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { text: "hello personalization" });

  t.same(db.positions[Object.keys(db.docs)[0]], {
    text: { hello: [{ start: 0, length: 5 }], person: [{ start: 6, length: 15 }] },
  });
});

t.test("should retrieve positions", async t => {
  const schema = {
    text: "string",
  } as const;

  const db = create({ schema, hooks: { afterInsert } }) as LyraWithHighlight<typeof schema>;

  insertWithHooks(db, { text: "hello world" });

  t.same(searchWithHighlight(db, { term: "hello" })[0].positions, { text: { hello: [{ start: 0, length: 5 }] } });
});
