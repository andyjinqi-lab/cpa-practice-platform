# CPA 备站持久化（PostgreSQL）上手清单

目标：让 `https://cpa-beta.pages.dev` 的注册/登录/做题记录持久化，不会因 Render 空闲重启丢失。

## 1. 在 Supabase 建库并建表

1. 打开 Supabase 项目 -> `SQL Editor`。
2. 新建 Query，把 `server/sql/init-postgres.sql` 全部粘贴进去执行。
3. 打开 `Project Settings` -> `Database`，复制连接串（URI）。
4. 把连接串密码改成你自己的真实密码，得到 `DATABASE_URL`。

示例格式：

```text
postgresql://postgres:你的密码@db.xxxxx.supabase.co:5432/postgres
```

## 2. 在 Render 配置 API 环境变量

打开 Render 的 `cpa-api` 服务 -> `Environment`，新增/确认以下变量：

- `DATABASE_URL` = 上一步 Supabase 连接串
- `APP_ORIGIN` = `https://cpa-beta.pages.dev`
- `RESEND_API_KEY` = 你的 Resend Key（已有可不改）
- `MAIL_FROM` = 发件邮箱（已有可不改）

保存后，点击 `Manual Deploy` -> `Deploy latest commit`。

健康检查：

- 打开 `https://cpa-api-iwre.onrender.com/api/health`
- 期望返回：`"storage":"postgresql"`

## 3. （可选）把旧 JSON 数据导入 PostgreSQL

如果你要保留旧账号/记录，在本地项目目录执行：

```powershell
$env:DATABASE_URL="postgresql://postgres:你的密码@db.xxxxx.supabase.co:5432/postgres"
node scripts/migrate-json-to-postgres.mjs
```

如果 JSON 文件不在默认位置，可带路径参数：

```powershell
node scripts/migrate-json-to-postgres.mjs "server/data/app-db.json"
```

## 4. Cloudflare Pages 指向统一 API

在 Cloudflare -> `cpa-beta` -> `Settings` -> `Variables and Secrets`：

- `VITE_API_BASE` = `https://cpa-api-iwre.onrender.com`

然后重新部署 `cpa-beta`。

## 5. 验证（按这个顺序）

1. 新注册一个测试邮箱（不是旧账号）。
2. 退出后重新登录，确认成功。
3. 做一套题并提交，刷新页面，确认记录还在。
4. 等 Render 空闲后再登录一次，确认数据还在（首次唤醒可能慢几十秒）。

## 6. 后续切回主站时怎么改

主站恢复后，为了中国用户速度更好：

1. 先把主站 API（国内）恢复稳定。
2. 仅修改 Cloudflare 的 `VITE_API_BASE` 到主站 API 域名。
3. Render API 保留为应急线路，不下线。

这样你可以随时 1 分钟内再切回 Render。
