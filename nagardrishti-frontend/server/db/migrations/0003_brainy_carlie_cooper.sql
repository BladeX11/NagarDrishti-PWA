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
CREATE INDEX "idx_evaluation_annotations_record_id" ON "evaluation_annotations" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_evaluation_annotations_annotator_id" ON "evaluation_annotations" USING btree ("annotator_id");