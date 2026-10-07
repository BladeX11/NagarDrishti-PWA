CREATE TABLE "adversarial_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid,
	"rule" text NOT NULL,
	"severity" text NOT NULL,
	"details" jsonb NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"resolution" text,
	"model_version" text DEFAULT 'adversarial-rules-v1.0' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "issue_media" ADD COLUMN "perceptual_hash" text;--> statement-breakpoint
ALTER TABLE "issue_media" ADD COLUMN "exif_lat" double precision;--> statement-breakpoint
ALTER TABLE "issue_media" ADD COLUMN "exif_lng" double precision;--> statement-breakpoint
ALTER TABLE "adversarial_flags" ADD CONSTRAINT "adversarial_flags_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adversarial_flags" ADD CONSTRAINT "adversarial_flags_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adversarial_flags_issue_id" ON "adversarial_flags" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_adversarial_flags_rule" ON "adversarial_flags" USING btree ("rule");--> statement-breakpoint
CREATE INDEX "idx_issue_media_phash" ON "issue_media" USING btree ("perceptual_hash");