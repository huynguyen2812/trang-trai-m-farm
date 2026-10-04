CREATE TABLE `access_audit` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`actor_id` text NOT NULL,
	`target_id` text NOT NULL,
	`before_state` text NOT NULL,
	`after_state` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE TABLE `account_access` (
	`tenant` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`suspended` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `user_id`)
);
