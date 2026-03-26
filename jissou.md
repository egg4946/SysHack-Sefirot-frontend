# 仕様書 (ver 3.0)

## 1. アプリ概要
チームのタスクと進捗を管理するためのWebアプリケーション。タスクの階層構造（最大2階層）と、全タスク均等ウェイトに基づく進捗の自動計算・視覚化に重点を置く。

## 2. システムの前提と進捗計算ロジック
進捗は「すべてのタスクの比重は均等」という前提に基づいて自動計算される。

* **階層の制限**: タスクは「親タスク」と「子タスク」の2階層のみ。孫タスクの作成は不可。
* **親タスクのコンテナ化**: 親タスクに子タスクが1つでも追加された場合、その親タスクは「コンテナ」となり、担当者の直接アサインや進捗の直接入力は不可となる。
* **進捗の算出式**:
    * **末端タスク**（子タスク、または子を持たない親タスク）: アサインされた全担当者の入力進捗（0〜100%）の平均値。
    * **コンテナ化した親タスク**: 配下にある全子タスクの進捗の平均値。
    * **プロジェクト全体**: すべての親タスクの進捗の平均値。
* **進捗の巻き戻り仕様**: タスクの新規追加・削除によって分母が変動した場合、全体の進捗率が低下（巻き戻り）することを仕様として許容する。

## 3. 画面構成と主な機能

共通コンポーネントとして、各画面のヘッダーにハンバーガーメニュー（≡）を配置し、画面ごとにアクションを出し分ける。

### 3.1. 認証とプロジェクト選択画面
* **新規登録**: ユーザー名（アカウント全体での本名）、メールアドレス、パスワード、パスワード（確認用）で登録。
* **ログイン**: 登録情報でログインし、アクセスキーを発行。
* **プロジェクト選択画面**:
    * 参加中のプロジェクト一覧（カード表示）。
    * プロジェクト新規作成、および招待コード（6桁）での参加機能。
    * ヘッダーメニュー: ログアウト

### 3.2. プロジェクト・メイン画面
* **タスク表示**: 親タスクと子タスクを混在させたツリー/リスト表示。
* **ソート機能**: 画面上部から「しめきり」「進捗」などでタスクをソート可能。
* **タスクの新規作成**: `parentId: null` の親タスクのみ作成可能。
* **招待コード発行**: メンバー招待用の6桁のコードを生成。
* **ヘッダーメニュー**: ログアウト、メンバー一覧、自身の表示名変更（プロジェクト内限定）。

### 3.3. タスク詳細画面
* **タスク編集**: タイトル、ステータスの変更、およびタスクの削除。
* **担当者振り分け（アサイン）**: タスクを遂行するメンバーの追加・削除。
* **個人進捗の更新**: 自身が担当するタスクの進捗（0〜100%）を更新。これがシステム全体の自動計算のトリガーとなる。
* **チェックリスト編集**: タスク内の細かいToDoを管理。「＋」ボタン等で項目を追加し、完了/未完了を切り替え。
* **子タスク追加**: 現在開いているタスクが「親タスク」の場合のみ、子タスクを追加可能。子タスクの詳細画面にはこの追加UIは表示されない。

### 3.4. 個人詳細画面（メンバー管理）
* メイン画面の「メンバー一覧」から特定のメンバーを選択して遷移。
* **パーソナライズされたタスク一覧**: メイン画面のUIを流用し、そのメンバーが担当していないタスクを除外（フィルタリング）して表示。
* **メンバーキック**: プロジェクトから該当メンバーを退出させる（※リーダー権限保持者のみ表示・実行可能とする制御を推奨）。

## 4. データ構造

```prisma
// ユーザー情報
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  hashedPassword String
  displayName    String
  memberships    CommunityMember[]
}

// プロジェクト（コミュニティ）
model Community {
  id         String   @id @default(uuid())
  name       String
  inviteCode String   @unique
  members    CommunityMember[]
  tasks      Task[]
}

// プロジェクト所属情報
model CommunityMember {
  id          String @id @default(uuid())
  userId      String
  communityId String
  displayName String // プロジェクト内での表示名
  role        String @default("member") // "member" | "leader"
  user        User   @relation(fields: [userId], references: [id])
  community   Community @relation(fields: [communityId], references: [id])
  @@unique([userId, communityId])
}

// タスク（最大2階層）
model Task {
  id          String   @id @default(uuid())
  communityId String
  title       String
  progress    Int      @default(0) // 自動計算されるタスクの進捗
  status      String   @default("unstarted")
  parentId    String?  // nullの場合は親タスク、IDがある場合は子タスク
  community   Community @relation(fields: [communityId], references: [id])
  assignments TaskAssignment[]
  checklists  ChecklistItem[]
}

// タスク担当情報（個人の進捗）
model TaskAssignment {
  id       String @id @default(uuid())
  taskId   String
  userId   String
  progress Int    @default(0) // 担当者個人の進捗
  task     Task   @relation(fields: [taskId], references: [id])
  @@unique([taskId, userId])
}

// チェックリスト項目
model ChecklistItem {
  id     String  @id @default(uuid())
  taskId String
  text   String
  isDone Boolean @default(false)
  task   Task    @relation(fields: [taskId], references: [id])
}