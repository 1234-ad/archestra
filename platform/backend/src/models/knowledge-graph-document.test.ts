import { describe, expect, test } from "@/test";
import KnowledgeGraphDocumentModel from "./knowledge-graph-document";

describe("KnowledgeGraphDocumentModel", () => {
  describe("create", () => {
    test("creates a document with required fields only", async ({
      makeOrganization,
    }) => {
      const org = await makeOrganization();

      const document = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "ext-doc-123",
        organizationId: org.id,
      });

      expect(document.id).toBeDefined();
      expect(document.externalDocumentId).toBe("ext-doc-123");
      expect(document.organizationId).toBe(org.id);
      expect(document.filename).toBeNull();
      expect(document.createdByUserId).toBeNull();
      expect(document.createdByAgentId).toBeNull();
      expect(document.labels).toEqual([]);
    });

    test("creates a document with all optional fields", async ({
      makeOrganization,
      makeUser,
      makeAgent,
    }) => {
      const org = await makeOrganization();
      const user = await makeUser();
      const agent = await makeAgent();

      const document = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "ext-doc-456",
        filename: "report.pdf",
        organizationId: org.id,
        createdByUserId: user.id,
        createdByAgentId: agent.id,
      });

      expect(document.externalDocumentId).toBe("ext-doc-456");
      expect(document.filename).toBe("report.pdf");
      expect(document.organizationId).toBe(org.id);
      expect(document.createdByUserId).toBe(user.id);
      expect(document.createdByAgentId).toBe(agent.id);
    });

    test("creates a document with labels", async ({ makeOrganization }) => {
      const org = await makeOrganization();

      const document = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "ext-doc-789",
        organizationId: org.id,
        labels: [
          { key: "environment", value: "production", keyId: "", valueId: "" },
          { key: "team", value: "engineering", keyId: "", valueId: "" },
        ],
      });

      expect(document.labels).toHaveLength(2);
      expect(document.labels[0].key).toBe("environment");
      expect(document.labels[0].value).toBe("production");
      expect(document.labels[1].key).toBe("team");
      expect(document.labels[1].value).toBe("engineering");
    });
  });

  describe("findById", () => {
    test("returns document with labels", async ({ makeOrganization }) => {
      const org = await makeOrganization();

      const created = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "ext-doc-find-1",
        organizationId: org.id,
        filename: "test.txt",
        labels: [
          { key: "environment", value: "staging", keyId: "", valueId: "" },
        ],
      });

      const found = await KnowledgeGraphDocumentModel.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.filename).toBe("test.txt");
      expect(found?.labels).toHaveLength(1);
      expect(found?.labels[0].key).toBe("environment");
      expect(found?.labels[0].value).toBe("staging");
    });

    test("returns null for non-existent document", async () => {
      const found = await KnowledgeGraphDocumentModel.findById(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeNull();
    });
  });

  describe("findByExternalId", () => {
    test("returns document by external ID and organization", async ({
      makeOrganization,
    }) => {
      const org = await makeOrganization();

      await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "unique-ext-id",
        organizationId: org.id,
        filename: "found.pdf",
      });

      const found = await KnowledgeGraphDocumentModel.findByExternalId(
        "unique-ext-id",
        org.id,
      );

      expect(found).not.toBeNull();
      expect(found?.externalDocumentId).toBe("unique-ext-id");
      expect(found?.filename).toBe("found.pdf");
    });

    test("returns null for non-existent external ID", async ({
      makeOrganization,
    }) => {
      const org = await makeOrganization();

      const found = await KnowledgeGraphDocumentModel.findByExternalId(
        "non-existent-ext-id",
        org.id,
      );

      expect(found).toBeNull();
    });

    test("returns null when organization does not match", async ({
      makeOrganization,
    }) => {
      const org1 = await makeOrganization();
      const org2 = await makeOrganization();

      await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "org-specific-ext-id",
        organizationId: org1.id,
      });

      // Try to find with different organization
      const found = await KnowledgeGraphDocumentModel.findByExternalId(
        "org-specific-ext-id",
        org2.id,
      );

      expect(found).toBeNull();
    });
  });

  describe("findByOrganization", () => {
    test("returns all documents for an organization", async ({
      makeOrganization,
    }) => {
      const org = await makeOrganization();

      await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "org-doc-1",
        organizationId: org.id,
        filename: "file1.txt",
      });

      await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "org-doc-2",
        organizationId: org.id,
        filename: "file2.txt",
        labels: [{ key: "environment", value: "dev", keyId: "", valueId: "" }],
      });

      const documents = await KnowledgeGraphDocumentModel.findByOrganization(
        org.id,
      );

      expect(documents).toHaveLength(2);
      expect(documents[0].filename).toBe("file1.txt");
      expect(documents[1].filename).toBe("file2.txt");
      expect(documents[1].labels).toHaveLength(1);
    });

    test("returns empty array when organization has no documents", async ({
      makeOrganization,
    }) => {
      const org = await makeOrganization();

      const documents = await KnowledgeGraphDocumentModel.findByOrganization(
        org.id,
      );

      expect(documents).toEqual([]);
    });

    test("does not return documents from other organizations", async ({
      makeOrganization,
    }) => {
      const org1 = await makeOrganization();
      const org2 = await makeOrganization();

      await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "org1-doc",
        organizationId: org1.id,
      });

      await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "org2-doc",
        organizationId: org2.id,
      });

      const org1Documents =
        await KnowledgeGraphDocumentModel.findByOrganization(org1.id);

      expect(org1Documents).toHaveLength(1);
      expect(org1Documents[0].externalDocumentId).toBe("org1-doc");
    });
  });

  describe("getLabelsForDocument", () => {
    test("returns labels sorted by key", async ({ makeOrganization }) => {
      const org = await makeOrganization();

      const document = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "sorted-labels-doc",
        organizationId: org.id,
        labels: [
          { key: "zebra", value: "z-value", keyId: "", valueId: "" },
          { key: "alpha", value: "a-value", keyId: "", valueId: "" },
          { key: "middle", value: "m-value", keyId: "", valueId: "" },
        ],
      });

      const labels = await KnowledgeGraphDocumentModel.getLabelsForDocument(
        document.id,
      );

      expect(labels).toHaveLength(3);
      expect(labels[0].key).toBe("alpha");
      expect(labels[1].key).toBe("middle");
      expect(labels[2].key).toBe("zebra");
    });

    test("returns empty array for document without labels", async ({
      makeOrganization,
    }) => {
      const org = await makeOrganization();

      const document = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "no-labels-doc",
        organizationId: org.id,
      });

      const labels = await KnowledgeGraphDocumentModel.getLabelsForDocument(
        document.id,
      );

      expect(labels).toEqual([]);
    });
  });

  describe("getLabelsForDocuments", () => {
    test("returns labels for multiple documents efficiently", async ({
      makeOrganization,
    }) => {
      const org = await makeOrganization();

      const doc1 = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "bulk-doc-1",
        organizationId: org.id,
        labels: [{ key: "env", value: "prod", keyId: "", valueId: "" }],
      });

      const doc2 = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "bulk-doc-2",
        organizationId: org.id,
        labels: [
          { key: "env", value: "dev", keyId: "", valueId: "" },
          { key: "team", value: "platform", keyId: "", valueId: "" },
        ],
      });

      const doc3 = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "bulk-doc-3",
        organizationId: org.id,
        // No labels
      });

      const labelsMap = await KnowledgeGraphDocumentModel.getLabelsForDocuments(
        [doc1.id, doc2.id, doc3.id],
      );

      expect(labelsMap.size).toBe(3);

      const doc1Labels = labelsMap.get(doc1.id);
      expect(doc1Labels).toHaveLength(1);
      expect(doc1Labels?.[0].key).toBe("env");
      expect(doc1Labels?.[0].value).toBe("prod");

      const doc2Labels = labelsMap.get(doc2.id);
      expect(doc2Labels).toHaveLength(2);
      expect(doc2Labels?.[0].key).toBe("env");
      expect(doc2Labels?.[1].key).toBe("team");

      const doc3Labels = labelsMap.get(doc3.id);
      expect(doc3Labels).toHaveLength(0);
    });

    test("returns empty map for empty document IDs array", async () => {
      const labelsMap = await KnowledgeGraphDocumentModel.getLabelsForDocuments(
        [],
      );
      expect(labelsMap.size).toBe(0);
    });
  });

  describe("delete", () => {
    test("deletes document successfully", async ({ makeOrganization }) => {
      const org = await makeOrganization();

      const document = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "to-delete-doc",
        organizationId: org.id,
        labels: [{ key: "env", value: "test", keyId: "", valueId: "" }],
      });

      // Verify document exists before delete
      const foundBefore = await KnowledgeGraphDocumentModel.findById(
        document.id,
      );
      expect(foundBefore).not.toBeNull();

      await KnowledgeGraphDocumentModel.delete(document.id);

      // Verify document is gone after delete
      const foundAfter = await KnowledgeGraphDocumentModel.findById(
        document.id,
      );
      expect(foundAfter).toBeNull();
    });

    test("returns false for non-existent document", async () => {
      const deleted = await KnowledgeGraphDocumentModel.delete(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(deleted).toBe(false);
    });

    test("cascade deletes associated labels", async ({ makeOrganization }) => {
      const org = await makeOrganization();

      const document = await KnowledgeGraphDocumentModel.create({
        externalDocumentId: "cascade-delete-doc",
        organizationId: org.id,
        labels: [
          { key: "env", value: "prod", keyId: "", valueId: "" },
          { key: "team", value: "backend", keyId: "", valueId: "" },
        ],
      });

      // Verify labels exist
      const labelsBefore =
        await KnowledgeGraphDocumentModel.getLabelsForDocument(document.id);
      expect(labelsBefore).toHaveLength(2);

      // Delete document
      await KnowledgeGraphDocumentModel.delete(document.id);

      // Labels should be deleted via cascade
      const labelsAfter =
        await KnowledgeGraphDocumentModel.getLabelsForDocument(document.id);
      expect(labelsAfter).toHaveLength(0);
    });
  });
});
