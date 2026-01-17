import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import agentsTable from "./agent";
import organizationsTable from "./organization";
import usersTable from "./user";

/**
 * Knowledge Graph Documents Table
 *
 * Tracks documents that have been ingested into the knowledge graph.
 * This enables Label-Based Access Control (LBAC) by storing metadata
 * about which documents are in the knowledge graph and who created them.
 */
const knowledgeGraphDocumentsTable = pgTable(
  "knowledge_graph_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Unique identifier for the document in the knowledge graph provider (e.g., LightRAG) */
    externalDocumentId: text("external_document_id").notNull(),
    /** Original filename if uploaded from a file */
    filename: text("filename"),
    /** Organization this document belongs to */
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    /** User who uploaded/created the document (optional - may be system) */
    createdByUserId: text("created_by_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    /** Profile/agent used when uploading the document (optional) */
    createdByAgentId: uuid("created_by_agent_id").references(
      () => agentsTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    // Index for fast lookups by external document ID
    externalDocumentIdIdx: index("kg_docs_external_document_id_idx").on(
      table.externalDocumentId,
    ),
    // Index for finding documents by organization
    organizationIdIdx: index("kg_docs_organization_id_idx").on(
      table.organizationId,
    ),
  }),
);

export default knowledgeGraphDocumentsTable;
