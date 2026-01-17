import { asc, eq, inArray } from "drizzle-orm";
import db, { schema } from "@/database";
import type { AgentLabelWithDetails } from "@/types";
import AgentLabelModel from "./agent-label";

/**
 * Knowledge graph document with its associated labels
 */
export interface KnowledgeGraphDocument {
  id: string;
  externalDocumentId: string;
  filename: string | null;
  organizationId: string;
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: Date;
  labels: AgentLabelWithDetails[];
}

/**
 * Parameters for creating a knowledge graph document
 */
export interface CreateKnowledgeGraphDocumentParams {
  externalDocumentId: string;
  filename?: string;
  organizationId: string;
  createdByUserId?: string;
  createdByAgentId?: string;
  /** Labels to associate with the document (typically from the profile used to upload) */
  labels?: AgentLabelWithDetails[];
}

class KnowledgeGraphDocumentModel {
  /**
   * Create a new knowledge graph document record with optional labels
   */
  static async create(
    params: CreateKnowledgeGraphDocumentParams,
  ): Promise<KnowledgeGraphDocument> {
    const {
      externalDocumentId,
      filename,
      organizationId,
      createdByUserId,
      createdByAgentId,
      labels = [],
    } = params;

    // Create the document
    const [document] = await db
      .insert(schema.knowledgeGraphDocumentsTable)
      .values({
        externalDocumentId,
        filename: filename || null,
        organizationId,
        createdByUserId: createdByUserId || null,
        createdByAgentId: createdByAgentId || null,
      })
      .returning();

    // Associate labels with the document
    if (labels.length > 0) {
      const labelInserts: {
        documentId: string;
        keyId: string;
        valueId: string;
      }[] = [];

      for (const label of labels) {
        const keyId = await AgentLabelModel.getOrCreateKey(label.key);
        const valueId = await AgentLabelModel.getOrCreateValue(label.value);
        labelInserts.push({ documentId: document.id, keyId, valueId });
      }

      await db
        .insert(schema.knowledgeGraphDocumentLabelsTable)
        .values(labelInserts);
    }

    return {
      ...document,
      labels,
    };
  }

  /**
   * Get a document by its ID with labels
   */
  static async findById(id: string): Promise<KnowledgeGraphDocument | null> {
    const [document] = await db
      .select()
      .from(schema.knowledgeGraphDocumentsTable)
      .where(eq(schema.knowledgeGraphDocumentsTable.id, id))
      .limit(1);

    if (!document) {
      return null;
    }

    const labels = await KnowledgeGraphDocumentModel.getLabelsForDocument(id);

    return {
      ...document,
      labels,
    };
  }

  /**
   * Get a document by its external ID (from the knowledge graph provider)
   */
  static async findByExternalId(
    externalDocumentId: string,
    organizationId: string,
  ): Promise<KnowledgeGraphDocument | null> {
    const [document] = await db
      .select()
      .from(schema.knowledgeGraphDocumentsTable)
      .where(
        eq(
          schema.knowledgeGraphDocumentsTable.externalDocumentId,
          externalDocumentId,
        ),
      )
      .limit(1);

    if (!document || document.organizationId !== organizationId) {
      return null;
    }

    const labels = await KnowledgeGraphDocumentModel.getLabelsForDocument(
      document.id,
    );

    return {
      ...document,
      labels,
    };
  }

  /**
   * Get all labels for a specific document
   */
  static async getLabelsForDocument(
    documentId: string,
  ): Promise<AgentLabelWithDetails[]> {
    const rows = await db
      .select({
        keyId: schema.knowledgeGraphDocumentLabelsTable.keyId,
        valueId: schema.knowledgeGraphDocumentLabelsTable.valueId,
        key: schema.labelKeysTable.key,
        value: schema.labelValuesTable.value,
      })
      .from(schema.knowledgeGraphDocumentLabelsTable)
      .leftJoin(
        schema.labelKeysTable,
        eq(
          schema.knowledgeGraphDocumentLabelsTable.keyId,
          schema.labelKeysTable.id,
        ),
      )
      .leftJoin(
        schema.labelValuesTable,
        eq(
          schema.knowledgeGraphDocumentLabelsTable.valueId,
          schema.labelValuesTable.id,
        ),
      )
      .where(
        eq(schema.knowledgeGraphDocumentLabelsTable.documentId, documentId),
      )
      .orderBy(asc(schema.labelKeysTable.key));

    return rows.map((row) => ({
      keyId: row.keyId,
      valueId: row.valueId,
      key: row.key || "",
      value: row.value || "",
    }));
  }

  /**
   * Get all documents for an organization
   */
  static async findByOrganization(
    organizationId: string,
  ): Promise<KnowledgeGraphDocument[]> {
    const documents = await db
      .select()
      .from(schema.knowledgeGraphDocumentsTable)
      .where(
        eq(schema.knowledgeGraphDocumentsTable.organizationId, organizationId),
      )
      .orderBy(asc(schema.knowledgeGraphDocumentsTable.createdAt));

    if (documents.length === 0) {
      return [];
    }

    // Get labels for all documents
    const labelsMap = await KnowledgeGraphDocumentModel.getLabelsForDocuments(
      documents.map((d) => d.id),
    );

    return documents.map((document) => ({
      ...document,
      labels: labelsMap.get(document.id) || [],
    }));
  }

  /**
   * Get labels for multiple documents in one query to avoid N+1
   */
  static async getLabelsForDocuments(
    documentIds: string[],
  ): Promise<Map<string, AgentLabelWithDetails[]>> {
    if (documentIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        documentId: schema.knowledgeGraphDocumentLabelsTable.documentId,
        keyId: schema.knowledgeGraphDocumentLabelsTable.keyId,
        valueId: schema.knowledgeGraphDocumentLabelsTable.valueId,
        key: schema.labelKeysTable.key,
        value: schema.labelValuesTable.value,
      })
      .from(schema.knowledgeGraphDocumentLabelsTable)
      .leftJoin(
        schema.labelKeysTable,
        eq(
          schema.knowledgeGraphDocumentLabelsTable.keyId,
          schema.labelKeysTable.id,
        ),
      )
      .leftJoin(
        schema.labelValuesTable,
        eq(
          schema.knowledgeGraphDocumentLabelsTable.valueId,
          schema.labelValuesTable.id,
        ),
      )
      .where(
        inArray(
          schema.knowledgeGraphDocumentLabelsTable.documentId,
          documentIds,
        ),
      )
      .orderBy(asc(schema.labelKeysTable.key));

    const labelsMap = new Map<string, AgentLabelWithDetails[]>();

    // Initialize all document IDs with empty arrays
    for (const documentId of documentIds) {
      labelsMap.set(documentId, []);
    }

    // Populate the map with labels
    for (const row of rows) {
      const labels = labelsMap.get(row.documentId) || [];
      labels.push({
        keyId: row.keyId,
        valueId: row.valueId,
        key: row.key || "",
        value: row.value || "",
      });
      labelsMap.set(row.documentId, labels);
    }

    return labelsMap;
  }

  /**
   * Delete a document and its associated labels
   */
  static async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.knowledgeGraphDocumentsTable)
      .where(eq(schema.knowledgeGraphDocumentsTable.id, id));

    return (result.rowCount || 0) > 0;
  }
}

export default KnowledgeGraphDocumentModel;
