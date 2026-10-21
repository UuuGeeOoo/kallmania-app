#!/bin/bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
BUILD_DIR="${BUILD_DIR:?BUILD_DIR is required}"
SOURCE_DB_DIR="$PROJECT_DIR/db"
SOURCE_DB_PATH="$SOURCE_DB_DIR/custom.db"
TARGET_DB_DIR="$BUILD_DIR/db"
TARGET_DB_PATH="$TARGET_DB_DIR/custom.db"

mkdir -p "$TARGET_DB_DIR"

if [ -f "$SOURCE_DB_PATH" ]; then
    echo "🗄️  复制 Preview 数据库到构建产物..."
    cp -a "$SOURCE_DB_DIR/." "$TARGET_DB_DIR/"
else
    echo "ℹ️  未找到 Preview 数据库 db/custom.db"
fi

# 读取 prisma/schema.prisma 中 datasource 块的 provider（取该块内第一行 provider =）。
# 关键修复：当 provider 为 postgresql（云数据库，如 Supabase）时，绝不能对
# file: URL 执行 prisma db push —— 会触发 P1012 校验错误
#（"the URL must start with the protocol postgresql://"），使本脚本 exit 1，
# 连带 build.sh 打包中断（无 start.sh / 无 tar.gz）→ 平台部署失败。
SCHEMA_PROVIDER="$(awk '/^datasource[ \t]/{f=1;next} f&&/^[}]/ {f=0} f&&/provider[ \t]*=/{print; exit}' "$PROJECT_DIR/prisma/schema.prisma" 2>/dev/null | sed 's/.*"\([^"]*\)".*/\1/' || true)"

if [ "$SCHEMA_PROVIDER" = "sqlite" ]; then
    echo "🗄️  同步构建产物中的数据库结构..."
    (
        cd "$PROJECT_DIR"
        DATABASE_URL="file:$TARGET_DB_PATH" bun run db:push
    )
elif [ -f "$TARGET_DB_PATH" ]; then
    echo "ℹ️  Prisma provider 为 '$SCHEMA_PROVIDER'（云数据库），产物沿用已复制的 SQLite 回退文件；线上结构以运行时 DATABASE_URL 指向的云端库为准。"
else
    echo "ℹ️  Prisma provider 为 '$SCHEMA_PROVIDER'（云数据库，如 Supabase），跳过 file: URL 的 prisma db push。"
    echo "🛟  生成有效的 SQLite 回退文件以满足部署产物结构（运行时优先加载 .env 的云端 DATABASE_URL）..."
    TARGET_DB_PATH="$TARGET_DB_PATH" bun -e 'import { Database } from "bun:sqlite"; const db = new Database(process.env.TARGET_DB_PATH); db.exec("CREATE TABLE IF NOT EXISTS _fallback_meta (key TEXT PRIMARY KEY, value TEXT);"); db.close(); console.log("SQLite fallback created");'
fi

if [ ! -f "$TARGET_DB_PATH" ]; then
    echo "❌ 数据库初始化命令执行成功，但未生成 $TARGET_DB_PATH"
    exit 1
fi

echo "✅ 构建产物数据库已准备完成"
ls -lah "$TARGET_DB_DIR"
