-- ① pgvector 익스텐션 활성화
create extension if not exists vector;

-- ② 공략 테이블 생성
create table if not exists guides (
  id          bigserial primary key,
  title       text not null,
  region      text not null default '공통',
  content     text not null,
  author      text default '익명',
  embedding   vector(1536),
  created_at  timestamptz default now()
);

-- ③ 벡터 인덱스 (검색 속도 향상)
create index if not exists guides_embedding_idx
  on guides using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ④ 유사도 검색 함수
create or replace function search_guides(
  query_embedding vector(1536),
  match_region    text default null,
  match_count     int  default 3
)
returns table (
  id         bigint,
  title      text,
  region     text,
  content    text,
  author     text,
  similarity float
)
language sql stable
as $$
  select
    g.id,
    g.title,
    g.region,
    g.content,
    g.author,
    1 - (g.embedding <=> query_embedding) as similarity
  from guides g
  where
    g.embedding is not null
    and (match_region is null or g.region = match_region or g.region = '공통')
  order by g.embedding <=> query_embedding
  limit match_count;
$$;
