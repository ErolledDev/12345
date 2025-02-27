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
      - `chat_id` (uuid, references chats)
      - `widget_id` (uuid, references widgets)
      - `content` (text)
      - `sender_type` (text)
      - `is_auto_reply` (boolean)
      - `auto_reply_keyword` (text)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for widget-based access control
*/

-- Create widgets table
CREATE TABLE IF NOT EXISTS widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  primary_color text DEFAULT '#0284c7',
  header_text text DEFAULT 'Chat with us',
  welcome_message text DEFAULT 'Hello! How can we help you today?',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create auto_replies table
CREATE TABLE IF NOT EXISTS auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  widget_id uuid REFERENCES widgets NOT NULL,
  keyword text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid REFERENCES widgets NOT NULL,
  visitor_name text,
  visitor_email text,
  visitor_page text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats NOT NULL,
  widget_id uuid REFERENCES widgets NOT NULL,
  content text NOT NULL,
  sender_type text NOT NULL,
  is_auto_reply boolean DEFAULT false,
  auto_reply_keyword text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Widgets policies
CREATE POLICY "Users can create their own widgets"
  ON widgets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own widgets"
  ON widgets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own widgets"
  ON widgets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto replies policies
CREATE POLICY "Users can create their own auto replies"
  ON auto_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own auto replies"
  ON auto_replies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own auto replies"
  ON auto_replies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own auto replies"
  ON auto_replies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Chats policies
CREATE POLICY "Users can view chats for their widgets"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    widget_id IN (
      SELECT id FROM widgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update chats for their widgets"
  ON chats
  FOR UPDATE
  TO authenticated
  USING (
    widget_id IN (
      SELECT id FROM widgets WHERE user_id = auth.uid()
    )
  );

-- Chat messages policies
CREATE POLICY "Users can view messages for their widgets"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    widget_id IN (
      SELECT id FROM widgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to handle auto-replies
CREATE OR REPLACE FUNCTION handle_auto_reply()
RETURNS TRIGGER AS $$
DECLARE
  matching_reply auto_replies%ROWTYPE;
  widget_owner_id uuid;
BEGIN
  -- Only process visitor messages
  IF NEW.sender_type = 'visitor' THEN
    -- Get widget owner
    SELECT user_id INTO widget_owner_id FROM widgets WHERE id = NEW.widget_id;
    
    -- Find matching auto-reply using simple keyword matching
    -- In a real implementation, this would use more sophisticated fuzzy matching
    SELECT * INTO matching_reply FROM auto_replies 
    WHERE widget_id = NEW.widget_id 
    AND position(lower(keyword) in lower(NEW.content)) > 0
    ORDER BY length(keyword) DESC
    LIMIT 1;
    
    -- If a matching auto-reply was found, create an auto-reply message
    IF matching_reply.id IS NOT NULL THEN
      INSERT INTO chat_messages (
        chat_id,
        widget_id,
        content,
        sender_type,
        is_auto_reply,
        auto_reply_keyword
      ) VALUES (
        NEW.chat_id,
        NEW.widget_id,
        matching_reply.response,
        'business',
        true,
        matching_reply.keyword
      );
      
      -- Update chat's updated_at timestamp
      UPDATE chats SET updated_at = now() WHERE id = NEW.chat_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-replies
CREATE TRIGGER trigger_auto_reply
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION handle_auto_reply();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_widgets_updated_at
BEFORE UPDATE ON widgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();