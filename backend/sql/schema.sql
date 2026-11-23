-- RFDSL product catalogue: one table for every device and software product.
--
-- Why one table: products differ wildly (a handheld reader has ~60 spec rows
-- in 8 groups, a tag has 6, software has modules and platforms instead), so
-- per-type tables would be unsearchable as a whole. Instead:
--
--   * Classification columns (indexed) answer "what is it":
--       product_type  hardware | software        (top level, as in /products/hardware/...)
--       category      reader | antenna | tag | printer | accessory | software
--       subcategory   free text, e.g. "Handheld Readers", "Fixed Readers", "Asset Management"
--       brand, model, frequency (UHF / HF / NFC / LF / Multi-band, hardware only)
--
--   * JSON columns hold everything whose shape varies per product:
--       gallery     ["/uploads/...jpg", ...]                     first image = cover
--       highlights  [{"title":"Features","items":[{"icon":"cpu","text":"..."}]}]
--       specs       [{"group":"UHF RFID","rows":[{"label":"Frequency","value":"865-868 MHz","note":""}]}]
--       links       [{"label":"Datasheet","url":"/uploads/...pdf","kind":"datasheet"}]
--     Section, group and row names are free text, so software can use
--     "Modules", "Platforms", "Integrations" etc. with no schema change.
--
--   * search_text is a flattened copy of every searchable word (name, model,
--     brand, classification, tagline, description, highlights, spec labels and
--     values, keywords), rebuilt by the API on every save. One indexed column
--     lets a single query search every product type at once.
--
-- MariaDB 10.4 stores JSON as LONGTEXT with a JSON_VALID check.

CREATE DATABASE IF NOT EXISTS `RFDSL` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `RFDSL`;

CREATE TABLE IF NOT EXISTS `products` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`          VARCHAR(160) NOT NULL,                 -- URL: /products/<slug>
  `name`          VARCHAR(200) NOT NULL,                 -- "MC51 Built-in UHF"
  `model`         VARCHAR(120) NULL,                     -- "MC51"
  `brand`         VARCHAR(120) NULL,                     -- "Chainway"
  `product_type`  ENUM('hardware','software') NOT NULL DEFAULT 'hardware',
  `category`      VARCHAR(40)  NOT NULL,
  `subcategory`   VARCHAR(100) NULL,
  `frequency`     VARCHAR(40)  NULL,
  `tagline`       VARCHAR(300) NULL,                     -- headline on the detail page
  `summary`       VARCHAR(600) NULL,                     -- one or two sentences for the list panels
  `description`   TEXT NULL,                             -- longer overview, plain text with blank-line paragraphs
  `image`         VARCHAR(500) NULL,                     -- cover image (copy of gallery[0], for fast lists)
  `gallery`       JSON NULL,
  `highlights`    JSON NULL,
  `specs`         JSON NULL,
  `links`         JSON NULL,
  `keywords`      VARCHAR(600) NULL,                     -- extra search words not shown on the page
  `is_published`  TINYINT(1) NOT NULL DEFAULT 1,
  `is_popular`    TINYINT(1) NOT NULL DEFAULT 0,         -- "Popular" badge
  `is_new`        TINYINT(1) NOT NULL DEFAULT 0,         -- "New" badge
  `is_on_sale`    TINYINT(1) NOT NULL DEFAULT 0,         -- "Sale" badge
  `sale_label`    VARCHAR(40) NULL,                      -- optional badge text, e.g. "20% off"
  `home_popular`  TINYINT(1) NOT NULL DEFAULT 0,         -- listed in home page "The most popular products"
  `home_new`      TINYINT(1) NOT NULL DEFAULT 0,         -- listed in home page "New arrivals"
  `home_sale`     TINYINT(1) NOT NULL DEFAULT 0,         -- listed in home page "Special offers"
  `sort_order`    INT NOT NULL DEFAULT 0,                -- lower first; ties by name
  `search_text`   MEDIUMTEXT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `ix_products_list` (`is_published`, `category`, `sort_order`, `name`),
  KEY `ix_products_type` (`is_published`, `product_type`),
  KEY `ix_products_sub` (`category`, `subcategory`),
  KEY `ix_products_brand` (`brand`),
  KEY `ix_products_flags` (`is_published`, `is_popular`, `is_new`, `is_on_sale`),
  KEY `ix_products_home` (`is_published`, `home_popular`, `home_new`, `home_sale`),
  FULLTEXT KEY `ft_products_search` (`search_text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages sent with the "Contact Us" form. Each one is also emailed to
-- CONTACT_EMAIL_TO; email_sent / email_error record whether that worked, so
-- nothing is lost if the mail server is down (it can be resent from /admin).
CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name`  VARCHAR(100) NOT NULL,
  `last_name`   VARCHAR(100) NOT NULL,
  `email`       VARCHAR(200) NOT NULL,
  `phone`       VARCHAR(50)  NULL,
  `company`     VARCHAR(200) NULL,
  `message`     TEXT NOT NULL,
  `page`        VARCHAR(300) NULL,                       -- page the form was sent from
  `status`      ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
  `admin_note`  TEXT NULL,                               -- internal note, never sent
  `email_sent`  TINYINT(1) NOT NULL DEFAULT 0,
  `email_error` VARCHAR(500) NULL,
  `ip`          VARCHAR(45)  NULL,
  `user_agent`  VARCHAR(300) NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_messages_status` (`status`, `created_at`),
  KEY `ix_messages_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visitor tracking (shown in /admin > Visitors). One visitor per IP address;
-- a session is a run of page views with no gap longer than 30 minutes; every
-- page view is kept in order with a readable label (e.g. the product's name).
-- Bots, /admin pages and the administrator's own browser are not recorded.
CREATE TABLE IF NOT EXISTS `visitors` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip`          VARCHAR(45)  NOT NULL,
  `first_seen`  DATETIME NOT NULL,
  `last_seen`   DATETIME NOT NULL,
  `sessions`    INT UNSIGNED NOT NULL DEFAULT 0,
  `page_views`  INT UNSIGNED NOT NULL DEFAULT 0,
  `user_agent`  VARCHAR(400) NULL,                       -- latest
  `device`      VARCHAR(20)  NULL,                       -- Desktop / Mobile / Tablet
  `browser`     VARCHAR(40)  NULL,
  `os`          VARCHAR(40)  NULL,
  `first_referrer` VARCHAR(500) NULL,                    -- how they first found the site
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_visitors_ip` (`ip`),
  KEY `ix_visitors_last_seen` (`last_seen`),
  KEY `ix_visitors_first_seen` (`first_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `visitor_sessions` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `visitor_id`  INT UNSIGNED NOT NULL,
  `started_at`  DATETIME NOT NULL,
  `last_activity` DATETIME NOT NULL,
  `page_views`  INT UNSIGNED NOT NULL DEFAULT 0,
  `referrer`    VARCHAR(500) NULL,
  `user_agent`  VARCHAR(400) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_sessions_visitor` (`visitor_id`, `started_at`),
  KEY `ix_sessions_started` (`started_at`),
  CONSTRAINT `fk_sessions_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `visitors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `page_views` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `visitor_id`  INT UNSIGNED NOT NULL,
  `session_id`  INT UNSIGNED NOT NULL,
  `path`        VARCHAR(500) NOT NULL,                   -- incl. query, e.g. /products?category=reader
  `label`       VARCHAR(300) NOT NULL,                   -- "MC51 Built-in UHF", "Products › Readers", "Home"
  `product_id`  INT UNSIGNED NULL,                       -- set for product pages
  `viewed_at`   DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_views_visitor` (`visitor_id`, `viewed_at`),
  KEY `ix_views_session` (`session_id`, `viewed_at`),
  KEY `ix_views_time` (`viewed_at`),
  KEY `ix_views_product` (`product_id`, `viewed_at`),
  CONSTRAINT `fk_views_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `visitors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_views_session` FOREIGN KEY (`session_id`) REFERENCES `visitor_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nemanja, the AI consultant on /solutions (OpenAI Responses API).
-- One row per chat; `ai_thread_id` is the OpenAI Conversation holding the AI
-- side's history, `ai_last_msg_id` the last visitor message Nemanja has seen. `status`: ai (Nemanja answers), waiting_human (handed off,
-- staff alerted), human (staff answering), closed.
CREATE TABLE IF NOT EXISTS `chat_conversations` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `token`         CHAR(43) NOT NULL,                     -- secret the visitor's browser uses to read/write this chat
  `ai_thread_id`  VARCHAR(100) NULL,
  `ai_last_msg_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `tokens_used`   INT UNSIGNED NOT NULL DEFAULT 0,          -- AI input + output tokens (usage limit)
  `cost_estimate` DECIMAL(10,4) NOT NULL DEFAULT 0,         -- US$, from AI_INPUT/OUTPUT_COST_PER_MTOK
  `status`        ENUM('ai','waiting_human','human','closed') NOT NULL DEFAULT 'ai',
  `busy_since`    DATETIME NULL,                         -- Nemanja is working on a reply
  `activity`      VARCHAR(120) NULL,                     -- e.g. "Searching the catalogue" (shown while busy)
  `customer_name`  VARCHAR(120) NULL,
  `customer_email` VARCHAR(200) NULL,
  `customer_phone` VARCHAR(60)  NULL,
  `handoff_reason` VARCHAR(500) NULL,
  `handoff_summary` TEXT NULL,
  `handoff_at`    DATETIME NULL,
  `staff_context` TEXT NULL,                             -- staff messages Nemanja hasn't seen yet (sent on hand-back)
  `unread_staff`  TINYINT(1) NOT NULL DEFAULT 0,         -- new visitor messages for staff to read
  `visitor_ip`    VARCHAR(45) NULL,
  `page`          VARCHAR(300) NULL,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_message_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_token` (`token`),
  KEY `ix_chat_status` (`status`, `last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` INT UNSIGNED NOT NULL,
  `role`            ENUM('visitor','assistant','staff','notice') NOT NULL,
  `content`         TEXT NOT NULL,
  `products`        JSON NULL,                           -- product cards shown with this message
  `event_id`        VARCHAR(100) NULL,                   -- OpenAI output item / tool call it came from (dedupe)
  `created_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_event` (`event_id`),
  KEY `ix_chat_messages` (`conversation_id`, `id`),
  CONSTRAINT `fk_chat_messages_conv` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Facts Nemanja found outside the website (manufacturer pages etc.). Only
-- approved notes are given back to Nemanja as product knowledge.
CREATE TABLE IF NOT EXISTS `knowledge_notes` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`      INT UNSIGNED NULL,                   -- NULL: a device not in the catalogue
  `device_name`     VARCHAR(200) NOT NULL,
  `content`         TEXT NOT NULL,
  `source_url`      VARCHAR(500) NULL,
  `status`          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `conversation_id` INT UNSIGNED NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at`     DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `ix_notes_status` (`status`, `created_at`),
  KEY `ix_notes_product` (`product_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Replies sent from /admin (only successfully sent ones are stored).
CREATE TABLE IF NOT EXISTS `contact_replies` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id`  INT UNSIGNED NOT NULL,
  `to_email`    VARCHAR(200) NOT NULL,
  `subject`     VARCHAR(200) NOT NULL,
  `body`        TEXT NOT NULL,
  `copied_to`   VARCHAR(300) NULL,                       -- company copy (Bcc), if requested
  `sent_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_replies_message` (`message_id`, `sent_at`),
  CONSTRAINT `fk_replies_message` FOREIGN KEY (`message_id`) REFERENCES `contact_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
