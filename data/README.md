# data 目录说明

本目录在源码版仓库中分为两类内容：

## 1. 需要提交的种子材料

- `knowledge-counseling/`
- `knowledge-resonance/`

这两部分是应用启动后用于生成本地知识索引的输入材料。

## 2. 不需要提交的运行时产物

- `db/`
- `indexes/`
- `exports/`
- `uploads/`
- `snapshots/`
- `desktop-runtime-config.json`

这些内容会在运行过程中自动创建或更新，已经在根 `.gitignore` 中忽略。

## 说明

- 第一次启动时，应用会自动创建缺失目录
- 第一次启动或种子材料变更后，应用会自动重建知识索引
- 如果你准备公开仓库，请确认种子材料本身具备可公开分发性
