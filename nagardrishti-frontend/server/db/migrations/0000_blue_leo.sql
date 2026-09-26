CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issue_duplicates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_a_id" uuid,
	"issue_b_id" uuid,
	"spatial_distance" double precision,
	"text_similarity" double precision,
	"image_similarity" double precision,
	"category_match" boolean,
	"overall_score" double precision NOT NULL,
	"status" text DEFAULT 'pending',
	"reviewed_by" uuid,
	"model_version" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "issue_duplicates_issue_a_id_issue_b_id_unique" UNIQUE("issue_a_id","issue_b_id")
);
--> statement-breakpoint
CREATE TABLE "issue_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid,
	"type" text NOT NULL,
	"private_path" text NOT NULL,
	"public_path" text,
	"file_hash" text NOT NULL,
	"captured_at" timestamp,
	"file_size" integer,
	"mime_type" text,
	"privacy_reviewed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issue_supporters" (
	"issue_id" uuid,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "issue_supporters_issue_id_user_id_pk" PRIMARY KEY("issue_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_ref" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"language" text DEFAULT 'en',
	"category" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"department_id" text,
	"assigned_to" uuid,
	"priority" integer DEFAULT 3,
	"urgency_explanation" text,
	"private_lat" double precision NOT NULL,
	"private_lng" double precision NOT NULL,
	"public_geohash" text NOT NULL,
	"public_lat" double precision,
	"public_lng" double precision,
	"ward_id" text,
	"sla_deadline" timestamp,
	"sla_breach" boolean DEFAULT false,
	"proof_state" text DEFAULT 'none',
	"reporter_id" uuid,
	"supporter_count" integer DEFAULT 0,
	"reopen_count" integer DEFAULT 0,
	"source_type" text DEFAULT 'self_collected',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "issues_public_ref_unique" UNIQUE("public_ref")
);
--> statement-breakpoint
CREATE TABLE "model_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid,
	"module" text NOT NULL,
	"prediction" jsonb NOT NULL,
	"confidence" double precision NOT NULL,
	"model_version" text NOT NULL,
	"data_version" text NOT NULL,
	"explanation" text,
	"was_overridden" boolean DEFAULT false,
	"override_value" jsonb,
	"overridden_by" uuid,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scorecard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ward_id" text,
	"department_id" text,
	"period" text NOT NULL,
	"total_issues" integer NOT NULL,
	"resolved_issues" integer NOT NULL,
	"sla_compliance" double precision NOT NULL,
	"median_resolution_days" double precision,
	"reopen_rate" double precision,
	"active_issues" integer,
	"method_version" text DEFAULT 'v1.0',
	"snapshot_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"token_hash" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sla_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"priority" integer DEFAULT 3,
	"deadline_days" integer NOT NULL,
	CONSTRAINT "sla_policies_category_priority_unique" UNIQUE("category","priority")
);
--> statement-breakpoint
CREATE TABLE "status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_num" serial NOT NULL,
	"issue_id" uuid,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_id" text,
	"actor_role" text NOT NULL,
	"reason" text,
	"prev_hash" text NOT NULL,
	"event_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "status_events_sequence_num_unique" UNIQUE("sequence_num")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_hash" text,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"ward" text,
	"department" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_phone_hash_unique" UNIQUE("phone_hash")
);
--> statement-breakpoint
CREATE TABLE "verification_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid,
	"user_id" uuid,
	"proof_version" integer DEFAULT 1,
	"vote" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "verification_votes_issue_id_user_id_proof_version_unique" UNIQUE("issue_id","user_id","proof_version")
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "issue_duplicates" ADD CONSTRAINT "issue_duplicates_issue_a_id_issues_id_fk" FOREIGN KEY ("issue_a_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_duplicates" ADD CONSTRAINT "issue_duplicates_issue_b_id_issues_id_fk" FOREIGN KEY ("issue_b_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_duplicates" ADD CONSTRAINT "issue_duplicates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_supporters" ADD CONSTRAINT "issue_supporters_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_supporters" ADD CONSTRAINT "issue_supporters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD CONSTRAINT "model_predictions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD CONSTRAINT "model_predictions_overridden_by_users_id_fk" FOREIGN KEY ("overridden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_snapshots" ADD CONSTRAINT "scorecard_snapshots_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_snapshots" ADD CONSTRAINT "scorecard_snapshots_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_votes" ADD CONSTRAINT "verification_votes_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_votes" ADD CONSTRAINT "verification_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_issue_duplicates_issue_a" ON "issue_duplicates" USING btree ("issue_a_id");--> statement-breakpoint
CREATE INDEX "idx_issue_duplicates_issue_b" ON "issue_duplicates" USING btree ("issue_b_id");--> statement-breakpoint
CREATE INDEX "idx_issue_duplicates_status" ON "issue_duplicates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_issue_media_issue_id" ON "issue_media" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_issue_media_file_hash" ON "issue_media" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "idx_issues_status" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_issues_category" ON "issues" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_issues_ward_id" ON "issues" USING btree ("ward_id");--> statement-breakpoint
CREATE INDEX "idx_issues_created_at" ON "issues" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_issues_public_geohash" ON "issues" USING btree ("public_geohash");--> statement-breakpoint
CREATE INDEX "idx_model_predictions_issue_id" ON "model_predictions" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_model_predictions_module" ON "model_predictions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "idx_model_predictions_model_version" ON "model_predictions" USING btree ("model_version");--> statement-breakpoint
CREATE INDEX "idx_status_events_issue_seq" ON "status_events" USING btree ("issue_id","sequence_num");