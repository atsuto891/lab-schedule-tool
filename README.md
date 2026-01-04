# 研究室 日程調整ツール

発表練習などの日程調整を自動で行うツールです。

## 機能

- 📅 候補日の一括設定（日付範囲指定）
- ⏰ 9:00〜18:00の1時間刻みで回答
- 🖱️ クリック&ドラッグで複数選択
- 👨‍🏫 先生の参加状況を視覚的に表示
- 📊 最適日程を自動判定（学生8割以上参加）
- 💬 コメント機能
- 👥 メンバー一覧（学年別）

## デプロイ手順

### 1. GitHubにリポジトリを作成

1. GitHub（https://github.com）にログイン
2. 右上の「+」→「New repository」をクリック
3. Repository name: `lab-schedule-tool`（任意の名前）
4. 「Create repository」をクリック

### 2. コードをプッシュ

```bash
cd schedule-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/lab-schedule-tool.git
git push -u origin main
```

### 3. Vercelでデプロイ

1. Vercel（https://vercel.com）にGitHubアカウントでログイン
2. 「Add New...」→「Project」をクリック
3. 先ほど作成したリポジトリを選択
4. 「Deploy」をクリック

### 4. Vercel KV（データベース）を設定

1. Vercelダッシュボードでプロジェクトを開く
2. 「Storage」タブをクリック
3. 「Create Database」→「KV」を選択
4. 名前を入力して「Create」
5. 「Connect to Project」でプロジェクトに接続
6. 「Redeploy」で再デプロイ

### 5. 完了！

デプロイされたURLを研究室メンバーに共有してください。

## ローカル開発

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセス
