/*
  # Create database schema for BusinessChat

  1. New Tables
    - `widgets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `primary_color` (text)
      - `header_text` (text)
      - `welcome_message` (text)
      - `logo_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `auto_replies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `widget_id` (uuid, references widgets)
      - `keyword` (text)
      - `response` (text)
      - `created_at` (timestamp)
    - `chats`
      - `id` (uuid, primary key)
      - `widget_id` (uuid, references widgets)
      - `visitor_name` (text)
      - `visitor_email` (text)
      - `visitor_page` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `chat_messages`
      - `id` (uuid, primary key)
      - `chat_