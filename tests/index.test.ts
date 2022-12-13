import { insertWithHooks } from "@lyrasearch/lyra";
import t from "tap";
import { createWithHighlight, afterInsert } from "../src";

t.test("it should store the position of tokens", t => {
  t.plan(1);

  const schema = {
    text: "string",
  } as const;

  const db = createWithHighlight({ schema, hooks: { afterInsert } });

  insertWithHooks(db, { text: "hello world" });

  t.same(db.positions, { text: { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] } });
});

t.test("it should manage nested schemas", t => {
  t.plan(1);

  const schema = {
    other: {
      text: "string",
    },
  } as const;

  const db = createWithHighlight({ schema, hooks: { afterInsert } });

  insertWithHooks(db, { other: { text: "hello world" } });

  t.same(db.positions, { "other.text": { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] } });
});

t.test("it should handle stemmed tokens", t => {
  t.plan(1);

  const schema = {
    text: "string",
  } as const;

  const db = createWithHighlight({ schema, hooks: { afterInsert } });

  insertWithHooks(db, { text: "hello personalization" });

  t.same(db.positions, { text: { hello: [{ start: 0, length: 5 }], person: [{ start: 6, length: 15 }] } });
});
