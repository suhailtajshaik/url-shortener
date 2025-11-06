-- URL Shortener Database Schema for Supabase (PostgreSQL)

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS click_details CASCADE;
DROP TABLE IF EXISTS urls CASCADE;

-- Create URLs table
CREATE TABLE urls (
  id BIGSERIAL PRIMARY KEY,
  url_code VARCHAR(30) NOT NULL UNIQUE,
  long_url TEXT NOT NULL,
  short_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for performance
  CONSTRAINT url_code_check CHECK (url_code ~ '^[a-zA-Z0-9_-]+$')
);

-- Create click_details table (separate table for better performance)
CREATE TABLE click_details (
  id BIGSERIAL PRIMARY KEY,
  url_id BIGINT NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  referer TEXT,
  ip VARCHAR(45),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  location_permission_granted BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX idx_urls_url_code ON urls(url_code);
CREATE INDEX idx_urls_long_url ON urls(long_url);
CREATE INDEX idx_urls_created_at ON urls(created_at DESC);
CREATE INDEX idx_urls_clicks ON urls(clicks DESC);
CREATE INDEX idx_urls_expires_at ON urls(expires_at);
CREATE INDEX idx_click_details_url_id ON click_details(url_id);
CREATE INDEX idx_click_details_timestamp ON click_details(timestamp DESC);

-- Create a function to automatically update last_clicked_at
CREATE OR REPLACE FUNCTION update_last_clicked_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE urls 
  SET last_clicked_at = NEW.timestamp,
      clicks = clicks + 1
  WHERE id = NEW.url_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_clicked_at and increment clicks
CREATE TRIGGER trigger_update_clicks
AFTER INSERT ON click_details
FOR EACH ROW
EXECUTE FUNCTION update_last_clicked_at();

-- Optional: Create a view for URL analytics
CREATE OR REPLACE VIEW url_analytics AS
SELECT 
  u.id,
  u.url_code,
  u.long_url,
  u.short_url,
  u.clicks,
  u.is_custom,
  u.created_at,
  u.last_clicked_at,
  u.expires_at,
  COUNT(cd.id) as total_click_records,
  COUNT(cd.id) FILTER (WHERE cd.location_permission_granted = true) as clicks_with_location,
  CASE 
    WHEN COUNT(cd.id) > 0 THEN 
      ROUND((COUNT(cd.id) FILTER (WHERE cd.location_permission_granted = true)::NUMERIC / COUNT(cd.id) * 100), 2)
    ELSE 0 
  END as location_permission_rate
FROM urls u
LEFT JOIN click_details cd ON u.id = cd.url_id
GROUP BY u.id, u.url_code, u.long_url, u.short_url, u.clicks, u.is_custom, u.created_at, u.last_clicked_at, u.expires_at;

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_details ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (adjust based on your security needs)
CREATE POLICY "Allow public read access on urls" ON urls
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on urls" ON urls
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on urls" ON urls
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on urls" ON urls
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access on click_details" ON click_details
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on click_details" ON click_details
  FOR INSERT WITH CHECK (true);

-- Grant permissions (if needed)
GRANT ALL ON urls TO anon, authenticated;
GRANT ALL ON click_details TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

