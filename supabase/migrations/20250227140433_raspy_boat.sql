/*
  # Additional schema changes for BusinessChat

  This migration adds any missing components that weren't already created
  by previous migrations.
*/

-- Check if tables exist before creating them
DO $$ 
BEGIN
  -- Create widgets table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'widgets') THEN
    CREATE TABLE widgets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users NOT NULL,
      primary_color text DEFAULT '#0284c7',
      header_text text DEFAULT 'Chat with us',
      welcome_message text DEFAULT 'Hello! How can we help you today?',
      logo_url text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
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
  END IF;

  -- Create auto_replies table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auto_replies') THEN
    CREATE TABLE auto_replies (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users NOT NULL,
      widget_id uuid REFERENCES widgets NOT NULL,
      keyword text NOT NULL,
      response text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE auto_replies ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
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
  END IF;

  -- Create chats table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chats') THEN
    CREATE TABLE chats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      widget_id uuid REFERENCES widgets NOT NULL,
      visitor_name text,
      visitor_email text,
      visitor_page text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
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
  END IF;

  -- Create chat_messages table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    CREATE TABLE chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      chat_id uuid REFERENCES chats NOT NULL,
      widget_id uuid REFERENCES widgets NOT NULL,
      content text NOT NULL,
      sender_type text NOT NULL,
      is_auto_reply boolean DEFAULT false,
      auto_reply_keyword text,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
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
  END IF;
END $$;

-- Create function to handle auto-replies if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_auto_reply') THEN
    CREATE FUNCTION handle_auto_reply()
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
  END IF;
END $$;

-- Create trigger for auto-replies if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'trigger_auto_reply') THEN
    CREATE TRIGGER trigger_auto_reply
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_auto_reply();
  END IF;
END $$;

-- Create function to update timestamps if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create triggers for updated_at columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_widgets_updated_at') THEN
    CREATE TRIGGER update_widgets_updated_at
    BEFORE UPDATE ON widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_chats_updated_at') THEN
    CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;