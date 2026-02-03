-- ==========================================
-- ⚠️ 注意：此腳本會刪除並重新建立所有表格（資料會清除）
-- 這樣可以確保您的 Schema 與最新代碼完全同步，解決 Cache 與欄位缺失問題。
-- ==========================================

-- 1. 刪除現有資料表（按依賴順序）
drop table if exists stock_tracking;
drop table if exists daily_trends_summary;
drop table if exists line_users;

-- 2. 建立每日摘要資料表 (包含最新類別與時段欄位)
create table daily_trends_summary (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date not null,
  category text default 'tw_trends', -- 'tw_trends' 或 'us_stocks'
  period text default 'morning', -- 'morning', 'evening', 'manual' 等時段
  summary_content text,
  raw_data jsonb,
  line_sent boolean default false,
  -- 定義唯一約束：同一日期、同一類別、同一時段只能有一份摘要
  unique (date, category, period)
);

-- 3. 建立 LINE 用戶追蹤表
create table line_users (
  user_id text primary key,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_active timestamp with time zone default timezone('utc'::text, now())
);

-- 4. 建立標的價格追蹤表
create table stock_tracking (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  summary_id bigint references daily_trends_summary(id) on delete cascade,
  date date not null,
  symbol text not null,
  name_zh text,
  name_en text,
  price numeric,
  change_percent numeric,
  currency text,
  raw_metadata jsonb
);

-- 5. 開啟 RLS 安全設定
alter table daily_trends_summary enable row level security;
alter table line_users enable row level security;
alter table stock_tracking enable row level security;

-- 6. 設定 RLS Policies (開放讀取給網頁，全開給後端)
create policy "Enable read access for all users" on daily_trends_summary for select using (true);
create policy "Enable read access for all users" on stock_tracking for select using (true);
create policy "Enable all access for backend service" on daily_trends_summary for all using (true);
create policy "Enable all access for backend service" on line_users for all using (true);
create policy "Enable all access for backend service" on stock_tracking for all using (true);

-- 7. 強制刷新 Schema 快取
notify pgrst, 'reload schema';
