CREATE TABLE "knowledge_graph_document_labels" (
	"document_id" uuid NOT NULL,
	"key_id" uuid NOT NULL,
	"value_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_graph_document_labels_document_id_key_id_pk" PRIMARY KEY("document_id","key_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_graph_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_document_id" text NOT NULL,
	"filename" text,
	"organization_id" text NOT NULL,
	"created_by_user_id" text,
	"created_by_agent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_graph_document_labels" ADD CONSTRAINT "knowledge_graph_document_labels_document_id_knowledge_graph_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_graph_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_graph_document_labels" ADD CONSTRAINT "knowledge_graph_document_labels_key_id_label_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."label_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_graph_document_labels" ADD CONSTRAINT "knowledge_graph_document_labels_value_id_label_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."label_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_graph_documents" ADD CONSTRAINT "knowledge_graph_documents_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_graph_documents" ADD CONSTRAINT "knowledge_graph_documents_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_graph_documents" ADD CONSTRAINT "knowledge_graph_documents_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;