-- guides 테이블에 image_url 컬럼 추가
ALTER TABLE guides ADD COLUMN IF NOT EXISTS image_url text;
