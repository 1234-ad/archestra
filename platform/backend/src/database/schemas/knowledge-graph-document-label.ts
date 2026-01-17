import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import knowledgeGraphDocumentsTable from "./knowledge-graph-document";
import labelKeyTable from "./label-key";
import labelValueTable from "./label-value";

/**
 * Knowledge Graph Document Labels Junction Table
 *
 * Associates labels with knowledge graph documents for Label-Based Access Control (LBAC).
 * Reuses the existing label_keys and label_values tables for consistency with profile labels.
 * When LightRAG supports metadata filtering, these labels will be passed during queries
 * to filter results based on user access.
 */
const knowledgeGraphDocumentLabelsTable = pgTable(
  "knowledge_graph_document_labels",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => knowledgeGraphDocumentsTable.id, {
        onDelete: "cascade",
      }),
    keyId: uuid("key_id")
      .notNull()
      .references(() => labelKeyTable.id, { onDelete: "cascade" }),
    valueId: uuid("value_id")
      .notNull()
      .references(() => labelValueTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.documentId, table.keyId] }),
  }),
);

export default knowledgeGraphDocumentLabelsTable;
