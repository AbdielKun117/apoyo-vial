-- 1. Add 'tools' column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::JSONB;

-- 2. Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on suggestions
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Users can insert their own suggestions
CREATE POLICY "Users can insert suggestions" 
ON suggestions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Policy: Only admins can view (for now, maybe just allow insert)
-- (Skipping view policy for now to keep it simple, or allow users to see their own)
CREATE POLICY "Users can view own suggestions" 
ON suggestions FOR SELECT 
USING (auth.uid() = user_id);
