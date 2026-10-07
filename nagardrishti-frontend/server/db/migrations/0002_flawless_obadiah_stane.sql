CREATE TABLE "evaluation_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" text NOT NULL,
	"annotator_id" text NOT NULL,
	"category" text NOT NULL,
	"priority" integer NOT NULL,
	"duplicate_label" text,
	"rationale" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "evaluation_annotations_record_id_annotator_id_unique" UNIQUE("record_id","annotator_id")
);
--> statement-breakpoint
CREATE TABLE "issue_graph_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_a_id" uuid,
	"issue_b_id" uuid,
	"spatial_distance" double precision NOT NULL,
	"text_similarity" double precision NOT NULL,
	"category_match" boolean NOT NULL,
	"temporal_similarity" double precision NOT NULL,
	"edge_score" double precision NOT NULL,
	"edge_type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"model_version" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "issue_graph_edges_issue_a_id_issue_b_id_unique" UNIQUE("issue_a_id","issue_b_id")
);
--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "raw_confidence" double precision;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "calibrated_confidence" double precision;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "abstained" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "abstention_reason" text;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "calibration_version" text;--> statement-breakpoint
ALTER TABLE "issue_graph_edges" ADD CONSTRAINT "issue_graph_edges_issue_a_id_issues_id_fk" FOREIGN KEY ("issue_a_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_graph_edges" ADD CONSTRAINT "issue_graph_edges_issue_b_id_issues_id_fk" FOREIGN KEY ("issue_b_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_evaluation_annotations_record_id" ON "evaluation_annotations" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_evaluation_annotations_annotator_id" ON "evaluation_annotations" USING btree ("annotator_id");--> statement-breakpoint
CREATE INDEX "idx_issue_graph_edges_issue_a" ON "issue_graph_edges" USING btree ("issue_a_id");--> statement-breakpoint
CREATE INDEX "idx_issue_graph_edges_issue_b" ON "issue_graph_edges" USING btree ("issue_b_id");--> statement-breakpoint
CREATE INDEX "idx_issue_graph_edges_score" ON "issue_graph_edges" USING btree ("edge_score");