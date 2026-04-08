import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    features: i.entity({
      ticketId: i.string().unique().indexed(),   // e.g. "S2-7306"
      title: i.string(),                          // feature name
      project: i.string(),                        // "web" | "server" | "mobile" | "functions"
      dri: i.string().optional(),                 // e.g. "Matheus"
      startDate: i.number().optional(),           // timestamp — when work began
      demoDate: i.number().optional(),            // timestamp — when demoed to product
      releaseDate: i.number().optional(),         // timestamp — confirmed production deploy
      linearUrl: i.string().optional(),           // link to Linear ticket
      notes: i.string().optional(),               // optional context
    }),
  },
});

// This helps Typescript display nicer schema-related types
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
