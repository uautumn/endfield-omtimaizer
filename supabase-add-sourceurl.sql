-- source_url 컬럼 추가
ALTER TABLE guides ADD COLUMN IF NOT EXISTS source_url text;
