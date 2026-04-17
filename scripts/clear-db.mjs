import { init } from "@instantdb/admin";

const db = init({
  appId: "867b7b82-9ef5-4467-864f-34d51728c0eb",
  adminToken: "e0059c70-9c08-471d-9dde-522121c623e3",
});

let total = 0;
while (true) {
  const { features } = await db.query({ features: { $: { limit: 100 } } });
  if (!features.length) break;
  await db.transact(features.map(x => db.tx.features[x.id].delete()));
  total += features.length;
  console.log(`Deleted ${total} so far...`);
}
console.log(`Done. Deleted ${total} total.`);
