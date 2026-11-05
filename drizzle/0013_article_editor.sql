CREATE TABLE "article_assistant_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"proposals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_assistant_messages" ADD CONSTRAINT "article_assistant_messages_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_assistant_article_idx" ON "article_assistant_messages" USING btree ("article_id","created_at");