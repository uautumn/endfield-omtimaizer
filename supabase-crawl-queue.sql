-- 크롤링 대기열 테이블
create table if not exists crawl_queue (
  id          bigserial primary key,
  url         text not null unique,
  source      text not null,
  region      text default '공통',
  status      text default 'pending',  -- pending / done / failed
  created_at  timestamptz default now(),
  processed_at timestamptz
);

create index if not exists crawl_queue_status_idx on crawl_queue(status);
